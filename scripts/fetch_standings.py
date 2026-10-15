#!/usr/bin/env python3
"""
Fetch previous-season team records from ESPN's public standings endpoint and
attach the (hand-maintained) postseason bracket + league awards.

Writes data/records.json:

    {
      "season": "2025-26",
      "updatedAt": "...",
      "teams": { "BOS": {"wins":56,"losses":26,"winPct":0.683,"confSeed":2,
                         "confRank":2,"playoffSeed":"2","ppg":114.9,"opppg":107.2,
                         "diff":7.7, "conference":"Eastern"} },
      "playoffs": {...},
      "awards": {...}
    }
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"

# ESPN abbreviations that differ from the ones used by the salary data
ABBR_FIX = {"SA": "SAS", "WSH": "WAS", "NO": "NOP", "NY": "NYK", "BK": "BKN",
            "GS": "GSW", "UTAH": "UTA", "PHO": "PHX"}

# Season whose records are shown as "last season" context next to 2026-27 payrolls.
PREV_SEASON_ESPN = 2026  # ESPN season year = start year + 1 -> the 2025-26 season
PREV_SEASON_LABEL = "2025-26"

# --------------------------------------------------------------------------- #
# 2025-26 postseason (verified against NBA.com / ESPN bracket coverage)
# --------------------------------------------------------------------------- #
PLAYOFFS = {
    "season": "2025-26",
    "champion": "NYK",
    "runnerUp": "SAS",
    "finalsMvp": {"name": "Jalen Brunson", "team": "NYK"},
    "finals": {"series": "4-1", "games": [
        {"n": 1, "away": "NYK", "awayScore": 105, "home": "SAS", "homeScore": 95},
        {"n": 2, "away": "NYK", "awayScore": 105, "home": "SAS", "homeScore": 104},
        {"n": 3, "away": "SAS", "awayScore": 115, "home": "NYK", "homeScore": 111},
        {"n": 4, "away": "SAS", "awayScore": 106, "home": "NYK", "homeScore": 107},
        {"n": 5, "away": "NYK", "awayScore": 94, "home": "SAS", "homeScore": 90},
    ]},
    "rounds": [
        {
            "name": "firstRound",
            "series": [
                {"conf": "East", "winner": "DET", "winnerSeed": 1, "loser": "ORL", "loserSeed": 8, "result": "4-3"},
                {"conf": "East", "winner": "CLE", "winnerSeed": 4, "loser": "TOR", "loserSeed": 5, "result": "4-?"},
                {"conf": "East", "winner": "NYK", "winnerSeed": 3, "loser": "ATL", "loserSeed": 6, "result": "4-?"},
                {"conf": "East", "winner": "BOS", "winnerSeed": 2, "loser": "PHI", "loserSeed": 7, "result": "4-?"},
                {"conf": "West", "winner": "OKC", "winnerSeed": 1, "loser": "PHX", "loserSeed": 7, "result": "4-0"},
                {"conf": "West", "winner": "LAL", "winnerSeed": 4, "loser": "HOU", "loserSeed": 5, "result": "4-?"},
                {"conf": "West", "winner": "DEN", "winnerSeed": 3, "loser": "MIN", "loserSeed": 6, "result": "4-?"},
                {"conf": "West", "winner": "SAS", "winnerSeed": 2, "loser": "POR", "loserSeed": 8, "result": "4-1"},
            ],
        },
        {
            "name": "confSemis",
            "series": [
                {"conf": "East", "winner": "CLE", "winnerSeed": 4, "loser": "DET", "loserSeed": 1, "result": "4-3"},
                {"conf": "East", "winner": "NYK", "winnerSeed": 3, "loser": "BOS", "loserSeed": 2, "result": "4-0"},
                {"conf": "West", "winner": "OKC", "winnerSeed": 1, "loser": "LAL", "loserSeed": 4, "result": "4-0"},
                {"conf": "West", "winner": "SAS", "winnerSeed": 2, "loser": "DEN", "loserSeed": 3, "result": "4-2"},
            ],
        },
        {
            "name": "confFinals",
            "series": [
                {"conf": "East", "winner": "NYK", "winnerSeed": 3, "loser": "CLE", "loserSeed": 4, "result": "4-0"},
                {"conf": "West", "winner": "SAS", "winnerSeed": 2, "loser": "OKC", "loserSeed": 1, "result": "4-3"},
            ],
        },
    ],
    # how far each team got: 0 = missed playoffs, 1..4 = round reached (4 = champion)
    "resultByTeam": {
        "NYK": "champion", "SAS": "finals",
        "CLE": "confFinals", "OKC": "confFinals",
        "DET": "confSemis", "BOS": "confSemis", "LAL": "confSemis", "DEN": "confSemis",
        "ORL": "firstRound", "TOR": "firstRound", "ATL": "firstRound", "PHI": "firstRound",
        "PHX": "firstRound", "HOU": "firstRound", "MIN": "firstRound", "POR": "firstRound",
    },
    "note": "Series scores marked '?' were not individually verified; the winner and "
            "round are confirmed. Source: NBA.com / ESPN bracket coverage, June 2026.",
}

AWARDS = {
    "season": "2025-26",
    "list": [
        {"key": "mvp", "player": "Shai Gilgeous-Alexander", "team": "OKC"},
        {"key": "roy", "player": "Cooper Flagg", "team": "DAL"},
        {"key": "dpoy", "player": "Victor Wembanyama", "team": "SAS"},
        {"key": "mip", "player": "Nickeil Alexander-Walker", "team": "ATL"},
        {"key": "sixth", "player": "Keldon Johnson", "team": "SAS"},
        {"key": "clutch", "player": "Shai Gilgeous-Alexander", "team": "OKC"},
        {"key": "coy", "player": "Joe Mazzulla", "team": "BOS", "coach": True},
        {"key": "eoy", "player": "Brad Stevens", "team": "BOS", "exec": True},
        {"key": "finalsMvp", "player": "Jalen Brunson", "team": "NYK"},
    ],
}


def get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def stat(entry: dict, name: str):
    for s in entry.get("stats", []):
        if s.get("name") == name:
            return s.get("displayValue") or s.get("value")
    return None


def main() -> None:
    url = (
        "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings"
        f"?season={PREV_SEASON_ESPN}&level=2"
    )
    try:
        data = get(url)
    except Exception as exc:  # noqa: BLE001
        print(f"standings fetch failed: {exc}", file=sys.stderr)
        data = None

    teams: dict[str, dict] = {}
    if data:
        for conf in data.get("children", []):
            conf_name = conf.get("name", "").replace(" Conference", "")
            entries = conf.get("standings", {}).get("entries", [])
            # ESPN lists entries alphabetically; rank them by win percentage
            entries = sorted(
                entries,
                key=lambda e: -int(float(stat(e, "wins") or 0)) / max(
                    int(float(stat(e, "wins") or 0)) + int(float(stat(e, "losses") or 0)), 1
                ),
            )
            for rank, e in enumerate(entries, 1):
                abbr = e["team"].get("abbreviation") or ""
                abbr = ABBR_FIX.get(abbr, abbr)
                wins = int(float(stat(e, "wins") or 0))
                losses = int(float(stat(e, "losses") or 0))
                seed = stat(e, "playoffSeed")
                teams[abbr] = {
                    "abbr": abbr,
                    "conference": conf_name,
                    "wins": wins,
                    "losses": losses,
                    "winPct": round(wins / max(wins + losses, 1), 3),
                    "confRank": rank,
                    "confSeed": int(seed) if seed and str(seed).isdigit() else None,
                    "gamesBehind": stat(e, "gamesBehind"),
                    "ppg": float(stat(e, "avgPointsFor") or 0),
                    "opppg": float(stat(e, "avgPointsAgainst") or 0),
                    "diff": float(stat(e, "differential") or 0),
                    "streak": stat(e, "streak"),
                    "playoffSeed": int(seed) if seed and str(seed).isdigit() else None,
                    # seeds 7-10 enter the play-in tournament, not the bracket proper
                    "madePlayoffs": bool(seed) and str(seed).isdigit() and int(seed) <= 6,
                    "playIn": bool(seed) and str(seed).isdigit() and int(seed) >= 7,
                    "result": PLAYOFFS["resultByTeam"].get(abbr, "missed"),
                }

    out = {
        "season": PREV_SEASON_LABEL,
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "site.api.espn.com (standings) + NBA.com/ESPN bracket coverage",
        "teams": teams,
        "playoffs": PLAYOFFS,
        "awards": AWARDS,
    }
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, "records.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(f"wrote data/records.json with {len(teams)} team records for {PREV_SEASON_LABEL}")


if __name__ == "__main__":
    main()
