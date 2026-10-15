#!/usr/bin/env python3
"""
Turn the raw scrape output (data/teams.json, data/league.json, data/records.json)
into the compact files the Next.js app reads at build time:

    data/app/league.json        league lines, all-team summaries, standings, playoffs, awards
    data/app/team/<slug>.json   one full team record (roster, cap/tax, future payroll)
    data/app/players.json       every player in the snapshot, flat + sorted by salary

Also computes the CBA luxury-tax estimate for each team (bracket tax + apron
surcharges, repeater rates) so the UI does not have to trust a single source.

Run:  python3 scripts/build_data.py
"""
from __future__ import annotations

import json
import os
import re
import shutil
from datetime import datetime, timezone
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
APP = os.path.join(DATA, "app")
TEAM_DIR = os.path.join(APP, "team")

# --------------------------------------------------------------------------- #
# luxury tax (2023 CBA, still in force for 2026-27)
# --------------------------------------------------------------------------- #

STANDARD_RATES = [1.00, 1.25, 3.50, 4.75]
REPEATER_RATES = [3.00, 3.25, 5.50, 6.75]


def luxury_tax(tax_salary: int, tax_line: int, apron1: int, apron2: int,
               bracket: int, repeater: bool) -> dict[str, Any]:
    """Bracket tax plus first/second-apron surcharges. Returns a breakdown."""
    overage = max(0, tax_salary - tax_line)
    rates = REPEATER_RATES if repeater else STANDARD_RATES
    rows: list[dict[str, Any]] = []
    tax = 0.0
    remaining = float(overage)
    index = 0
    while remaining > 1e-9:
        width = bracket if index < 4 else bracket
        rate = rates[index] if index < 4 else rates[3] + 0.50 * (index - 3)
        slice_ = min(remaining, width)
        amount = slice_ * rate
        rows.append({
            "bracket": index + 1,
            "from": int(round(overage - remaining)),
            "to": int(round(overage - remaining + slice_)),
            "rate": rate,
            "amount": int(round(amount)),
        })
        tax += amount
        remaining -= slice_
        index += 1

    sur1 = sur2 = 0.0
    if overage > 0:
        sur1 = max(0.0, min(tax_salary, apron1) - tax_line) * 2.50
        sur2 = max(0.0, min(tax_salary, apron2) - tax_line) * 3.50
    total = tax + sur1 + sur2
    return {
        "overage": overage,
        "repeater": repeater,
        "bracketTax": int(round(tax)),
        "apron1Surcharge": int(round(sur1)),
        "apron2Surcharge": int(round(sur2)),
        "total": int(round(total)),
        "rows": rows,
        "effectiveRate": round(tax / overage, 3) if overage else 0,
        "effectiveRateAllIn": round(total / overage, 3) if overage else 0,
    }


OPTION_TYPES = ("player option", "player-option", "club option", "team option",
                "mutual option", "early termination")


def find_options(text: str, season: str) -> list[tuple[str | None, str]]:
    """Extract outstanding (not yet exercised/declined) option years from free text.

    Returns [(season or None, kind)] where kind is playerOption / teamOption /
    mutual / eto. Clauses mentioning a past decision are skipped.
    """
    out: list[tuple[str | None, str]] = []
    if not text:
        return out
    low = text.lower()
    for chunk in re.split(r"[;.\n]", low):
        kind = None
        if "player option" in chunk or "player-option" in chunk:
            kind = "playerOption"
        elif "club option" in chunk or "team option" in chunk:
            kind = "teamOption"
        elif "mutual option" in chunk:
            kind = "mutual"
        elif "early termination" in chunk:
            kind = "eto"
        if not kind:
            continue
        if "exercised" in chunk or "declined" in chunk or "picked up" in chunk:
            continue
        season_token = None
        for m in re.finditer(r"(\d{4})[-\u2013](\d{2})", chunk):
            start = int(m.group(1))
            end = int(m.group(2))
            # only accept well-formed "2027-28" style season tokens
            if end in (start % 100 + 1, start + 1):
                season_token = f"{start}-{start % 100 + 1:02d}"
                break
        out.append((season_token, kind))
    return out


def final_option(text: str | None, through: str, season: str) -> str:
    """Status of the contract's last season: expiring / playerOption / teamOption / ..."""
    opts = [o for o in find_options(text or "", season) if o[0] in (None, through)]
    if opts:
        return opts[-1][1]
    low = (text or "").lower()
    if through == season and ("non-guaranteed" in low or "non guaranteed" in low):
        return "nonGuaranteed"
    return "expiring"


def main() -> None:
    teams_doc = json.load(open(os.path.join(DATA, "teams.json"), encoding="utf-8"))
    league_doc = json.load(open(os.path.join(DATA, "league.json"), encoding="utf-8"))
    records_doc = json.load(open(os.path.join(DATA, "records.json"), encoding="utf-8"))

    season = teams_doc["season"]
    lines: dict[str, int] = league_doc["lines"]
    bracket = lines["mleTax"]
    records = records_doc["teams"]

    if os.path.isdir(TEAM_DIR):
        shutil.rmtree(TEAM_DIR)
    os.makedirs(TEAM_DIR, exist_ok=True)

    summaries: list[dict[str, Any]] = []
    players: list[dict[str, Any]] = []
    future_rankings: dict[str, Any] = {}

    for raw in teams_doc["teams"]:
        slug = raw["slug"]
        abbr = raw["abbr"]
        rec = records.get(abbr, {})
        cap = raw["cap"]

        roster = []
        for p in raw["players"]:
            entry = {
                "id": p.get("slug") or p["name"].lower().replace(" ", "-"),
                "name": p["name"],
                "pos": p.get("pos"),
                "position": p.get("position"),
                "age": int(p["age"]) if p.get("age") else None,
                "height": p.get("height"),
                "country": p.get("country"),
                "salary": p.get("salary"),
                "salaryPrev": p.get("salaryPrev"),
                "salaryDelta": p.get("salaryDelta"),
                "capHit": p.get("capHit") or p.get("salary"),
                "capShare": p.get("capShare"),
                "teamShare": p.get("teamPayrollShare"),
                "contractValue": p.get("contractValue"),
                "guaranteed": p.get("guaranteed"),
                "contractType": p.get("contractType"),
                "contractThrough": (p.get("contractThrough") or "").replace("\u2013", "-"),
                "option": p.get("option"),
                "optionKind": final_option(p.get("option"), (p.get("contractThrough") or "").replace("\u2013", "-"), season),
                "freeAgency": int(p["freeAgency"]) if p.get("freeAgency") else None,
                "careerEarnings": p.get("careerEarnings"),
                "netWorth": p.get("netWorth"),
            }
            roster.append(entry)
            players.append({**entry, "team": abbr, "teamName": raw["name"], "teamSlug": slug,
                            "teamColor": raw.get("color")})

        # ---- scheduled future payroll (sum of the contract table) --------- #
        years = [y.replace("\u2013", "-") for y in raw["future"]["years"]]
        scheduled: dict[str, int] = {y: 0 for y in years}
        guaranteed_future: dict[str, int] = {y: 0 for y in years}
        for row in raw["future"]["rows"]:
            for y, cell in zip(years, row["cells"]):
                amt = cell.get("amount") or 0
                scheduled[y] += amt
                if cell.get("option") != "PO":  # player options may be declined
                    guaranteed_future[y] += amt

        # ---- tax position ------------------------------------------------- #
        tax_salary = cap.get("taxSalary") or raw.get("payrollCap") or 0
        apron_salary = cap.get("apronSalary") or tax_salary
        payroll = raw.get("payrollCap") or raw.get("payrollActive") or 0
        tax = luxury_tax(tax_salary, lines["tax"], lines["apron1"], lines["apron2"],
                          bracket, bool(cap.get("repeater")))

        end_year = int(season.split("-")[1]) + 2000  # "2026-27" -> 2027
        expiring = [p for p in roster if p.get("contractThrough") == season]
        pending_options = []
        for p, src in zip(roster, raw["players"]):
            for opt_season, kind in find_options(src.get("option") or "", season):
                if opt_season and opt_season > season:
                    pending_options.append({
                        "name": p["name"], "season": opt_season, "kind": kind,
                        "salary": p.get("salary"), "age": p.get("age"),
                    })
        pending_options.sort(key=lambda x: (x["season"], -(x["salary"] or 0)))
        team = {
            "slug": slug,
            "name": raw["name"],
            "abbr": abbr,
            "city": " ".join(raw["name"].split(" ")[:-1]),
            "nickname": raw["name"].split(" ")[-1],
            "conference": raw.get("conference"),
            "division": raw.get("division"),
            "color": raw.get("color") or "#17408B",
            "logo": f"/logos/{abbr.lower()}.svg",
            "teamId": raw.get("teamId"),
            "season": season,
            "snapshotDate": raw.get("snapshotDate"),
            "payroll": payroll,
            "payrollActive": raw.get("payrollActive"),
            "payrollCash": raw.get("payrollCash"),
            "deadCap": cap.get("deadCap") or 0,
            "capHolds": cap.get("capHolds") or 0,
            "rosterTotal": sum(p["capHit"] or 0 for p in roster),
            "rosterCount": len(roster),
            "capShare": raw.get("capShare"),
            "top3Share": raw.get("top3Share"),
            "rank": raw.get("rank"),
            "payrollDelta": raw.get("payrollDelta"),
            "prevSeason": raw.get("prevSeason"),
            "prevPayroll": raw.get("prevPayroll"),
            "history": raw.get("history") or [],
            "taxSalary": tax_salary,
            "apronSalary": apron_salary,
            "repeater": bool(cap.get("repeater")),
            "taxpayerPrev4": cap.get("taxpayerPrev4") or 0,
            "taxHistory": cap.get("taxHistory") or [],
            "siteTax": cap.get("estimatedTax") or 0,
            "tax": tax,
            "overCap": payroll - lines["cap"],
            "capSpace": max(0, lines["cap"] - payroll),
            "overTax": max(0, tax_salary - lines["tax"]),
            "roomToTax": lines["tax"] - tax_salary,
            "roomToApron1": lines["apron1"] - apron_salary,
            "roomToApron2": lines["apron2"] - apron_salary,
            "apronLevel": ("second" if apron_salary > lines["apron2"]
                           else "first" if apron_salary > lines["apron1"]
                           else "tax" if tax_salary > lines["tax"]
                           else "belowTax"),
            "roster": roster,
            "futureYears": years,
            "futureRows": raw["future"]["rows"],
            "scheduled": scheduled,
            "scheduledGuaranteed": guaranteed_future,
            "expiring": [{"name": p["name"], "salary": p["salary"], "option": p["optionKind"],
                           "age": p["age"], "pos": p["pos"]} for p in expiring],
            "pendingOptions": pending_options,
            "expiringSalary": sum(p["salary"] or 0 for p in expiring),
            "contractNote": raw.get("contractNote"),
            "eraNote": raw.get("eraNote"),
            "record": rec,
        }

        with open(os.path.join(TEAM_DIR, f"{slug}.json"), "w", encoding="utf-8") as fh:
            json.dump(team, fh, ensure_ascii=False, separators=(",", ":"))

        summaries.append({
            "slug": slug, "name": team["name"], "abbr": abbr, "city": team["city"],
            "nickname": team["nickname"], "conference": team["conference"],
            "division": team["division"], "color": team["color"], "logo": team["logo"],
            "payroll": payroll, "payrollActive": team["payrollActive"],
            "payrollCash": team["payrollCash"], "deadCap": team["deadCap"],
            "capHolds": team["capHolds"], "rosterCount": team["rosterCount"],
            "rank": team["rank"], "capShare": team["capShare"], "top3Share": team["top3Share"],
            "payrollDelta": team["payrollDelta"], "prevPayroll": team["prevPayroll"],
            "taxSalary": tax_salary, "apronSalary": apron_salary,
            "overCap": team["overCap"], "capSpace": team["capSpace"],
            "overTax": team["overTax"], "apronLevel": team["apronLevel"],
            "repeater": team["repeater"], "taxpayerPrev4": team["taxpayerPrev4"],
            "taxEstimate": tax["bracketTax"], "taxAllIn": tax["total"],
            "siteTax": team["siteTax"],
            "topPlayer": max(roster, key=lambda p: p["capHit"] or 0)["name"] if roster else None,
            "topSalary": max((p["capHit"] or 0) for p in roster) if roster else 0,
            "expiringCount": len(expiring), "expiringSalary": team["expiringSalary"],
            "scheduled": scheduled,
            "history": [{"season": h["season"], "payroll": h["payroll"]} for h in team["history"]],
            "wins": rec.get("wins"), "losses": rec.get("losses"), "winPct": rec.get("winPct"),
            "confSeed": rec.get("confSeed"), "playoffResult": rec.get("result"),
        })

        for s, payload in (raw["future"].get("rankings") or {}).items():
            future_rankings.setdefault(s, payload)

    summaries.sort(key=lambda s: s["rank"] or 99)
    players.sort(key=lambda p: -(p["capHit"] or 0))

    # ---- free agency feed ------------------------------------------------- #
    fa_rows: list[dict[str, Any]] = []
    opt_rows: list[dict[str, Any]] = []
    for raw in teams_doc["teams"]:
        for p in raw["players"]:
            through = (p.get("contractThrough") or "").replace("\u2013", "-")
            kind = final_option(p.get("option"), through, season)
            base = {
                "team": raw["abbr"],
                "teamName": raw["name"],
                "teamSlug": raw["slug"],
                "teamColor": raw.get("color") or "#17408B",
                "name": p["name"],
                "playerId": p.get("slug") or p["name"].lower().replace(" ", "-"),
                "pos": p.get("pos"),
                "age": int(p["age"]) if p.get("age") else None,
                "salary": p.get("salary"),
                "capHit": p.get("capHit") or p.get("salary"),
                "teamShare": p.get("teamPayrollShare"),
                "contractType": p.get("contractType"),
                "contractValue": p.get("contractValue"),
                "guaranteed": p.get("guaranteed"),
                "careerEarnings": p.get("careerEarnings"),
                "through": through,
                "option": kind,
                "optionText": p.get("option"),
                "freeAgency": int(p["freeAgency"]) if p.get("freeAgency") else None,
            }
            if through == season:
                fa_rows.append(base)
            for opt_season, opt_kind in find_options(p.get("option") or "", season):
                if opt_season and opt_season > season:
                    opt_rows.append({**base, "option": opt_kind, "optionSeason": opt_season,
                                     "through": opt_season})
    fa_rows.sort(key=lambda r: -(r["capHit"] or 0))
    opt_rows.sort(key=lambda r: (r["optionSeason"], -(r["capHit"] or 0)))

    by_team: dict[str, dict[str, Any]] = {}
    for r in fa_rows:
        slot = by_team.setdefault(r["team"], {
            "team": r["team"], "teamName": r["teamName"], "teamSlug": r["teamSlug"],
            "teamColor": r["teamColor"], "count": 0, "total": 0,
            "guaranteedOut": 0, "playerOptions": 0,
        })
        slot["count"] += 1
        slot["total"] += r["capHit"] or 0
        if r["option"] == "playerOption":
            slot["playerOptions"] += 1
        else:
            slot["guaranteedOut"] += r["capHit"] or 0
    free_agency = {
        "season": season,
        "nextSummer": int(season.split("-")[1]) + 2000,
        "expiring": fa_rows,
        "options": opt_rows,
        "byTeam": sorted(by_team.values(), key=lambda x: -x["total"]),
        "totals": {
            "count": len(fa_rows),
            "salary": sum(r["capHit"] or 0 for r in fa_rows),
            "guaranteedOut": sum(r["capHit"] or 0 for r in fa_rows if r["option"] != "playerOption"),
            "teams": len(by_team),
            "playerOptions": sum(1 for r in fa_rows if r["option"] == "playerOption"),
            "teamOptions": sum(1 for r in fa_rows if r["option"] == "teamOption"),
            "nonGuaranteed": sum(1 for r in fa_rows if r["option"] == "nonGuaranteed"),
            "optionCount": len(opt_rows),
            "optionSalary": sum(r["capHit"] or 0 for r in opt_rows),
        },
    }
    with open(os.path.join(APP, "free-agency.json"), "w", encoding="utf-8") as fh:
        json.dump(free_agency, fh, ensure_ascii=False, separators=(",", ":"))

    standings = {"Eastern": [], "Western": []}
    for abbr, rec in records.items():
        conf = rec.get("conference")
        if conf in standings:
            standings[conf].append({
                "abbr": abbr, "wins": rec["wins"], "losses": rec["losses"],
                "winPct": rec["winPct"], "seed": rec.get("confSeed"),
                "gb": rec.get("gamesBehind"), "diff": rec.get("diff"),
                "ppg": rec.get("ppg"), "opppg": rec.get("opppg"),
                "result": rec.get("result"), "madePlayoffs": rec.get("madePlayoffs"),
            })
    for conf in standings:
        standings[conf].sort(key=lambda r: -r["winPct"])

    league = {
        "season": season,
        "prevSeason": records_doc["season"],
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "snapshotDate": teams_doc.get("generatedAt"),
        "rosterSnapshot": next((t.get("snapshotDate") for t in teams_doc["teams"] if t.get("snapshotDate")), None),
        "source": teams_doc.get("source"),
        "lines": lines,
        "capHistory": league_doc.get("history", {}),
        "teams": summaries,
        "standings": standings,
        "playoffs": records_doc.get("playoffs"),
        "awards": records_doc.get("awards"),
        "futureRankings": future_rankings,
        "totals": {
            "payroll": sum(s["payroll"] or 0 for s in summaries),
            "cash": sum(s["payrollCash"] or 0 for s in summaries if s["payrollCash"]),
            "tax": sum(s["taxEstimate"] or 0 for s in summaries),
            "taxAllIn": sum(s["taxAllIn"] or 0 for s in summaries),
            "players": len(players),
            "taxpayers": sum(1 for s in summaries if s["overTax"] > 0),
            "apron1": sum(1 for s in summaries if s["apronLevel"] in ("first", "second")),
            "apron2": sum(1 for s in summaries if s["apronLevel"] == "second"),
            "underCap": sum(1 for s in summaries if (s["capSpace"] or 0) > 0),
            "avgPayroll": int(sum(s["payroll"] or 0 for s in summaries) / len(summaries)),
            "avgSalary": int(sum(p["capHit"] or 0 for p in players) / len(players)),
            "medianSalary": int(sorted(p["capHit"] or 0 for p in players)[len(players) // 2]),
        },
    }

    with open(os.path.join(APP, "league.json"), "w", encoding="utf-8") as fh:
        json.dump(league, fh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(APP, "players.json"), "w", encoding="utf-8") as fh:
        json.dump({"season": season, "count": len(players), "players": players},
                  fh, ensure_ascii=False, separators=(",", ":"))

    print(f"league.json {os.path.getsize(os.path.join(APP,'league.json'))/1024:.0f} KB")
    print(f"players.json {os.path.getsize(os.path.join(APP,'players.json'))/1024:.0f} KB ({len(players)} players)")
    print(f"free-agency.json {os.path.getsize(os.path.join(APP,'free-agency.json'))/1024:.0f} KB "
          f"({len(free_agency['expiring'])} expiring, {len(free_agency['options'])} option years)")
    print(f"team/*.json  {len(summaries)} files, "
          f"{sum(os.path.getsize(os.path.join(TEAM_DIR,f)) for f in os.listdir(TEAM_DIR))/1024:.0f} KB total")
    print("\ntop payrolls:")
    for s in summaries[:5]:
        print(f"  {s['rank']:2d}. {s['abbr']} ${s['payroll']/1e6:7.2f}M  bracketTax=${s['taxEstimate']/1e6:6.2f}M "
              f"(site ${s['siteTax']/1e6:6.2f}M)  allIn=${s['taxAllIn']/1e6:6.2f}M  {s['apronLevel']}  {s['wins']}-{s['losses']}")


if __name__ == "__main__":
    main()
