#!/usr/bin/env python3
"""
NBA Salary Tracker - team payroll scraper.

Pulls the public per-team salary pages (roster salaries, payroll history,
cap/tax position, future commitments, league comparison) and normalises them
into data/teams.json + data/league.json.

Usage:
    python3 scripts/scrape_teams.py                 # fetch everything
    python3 scripts/scrape_teams.py --offline       # re-parse cached raw HTML
    python3 scripts/scrape_teams.py --team boston-celtics

Raw HTML is cached under raw/ so re-runs are cheap and diffable.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from datetime import date, datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT, "raw")
DATA_DIR = os.path.join(ROOT, "data")
HOME_URL = "https://nbasalaries.com/"
TEAM_URL = "https://nbasalaries.com/teams/{slug}/"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #

MONEY_RE = re.compile(r"\$?\s*(-?[\d,]+(?:\.\d+)?)\s*([MBK])?", re.I)


def fetch(url: str, timeout: int = 40) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def cached_fetch(slug: str, offline: bool) -> str:
    path = os.path.join(RAW_DIR, f"{slug}.html")
    if os.path.exists(path):
        if offline:
            return open(path, encoding="utf-8", errors="replace").read()
        # refresh if older than 12h
        age = time.time() - os.path.getmtime(path)
        if age < 12 * 3600:
            return open(path, encoding="utf-8", errors="replace").read()
    if offline:
        raise SystemExit(f"no cached html for {slug} (run without --offline)")
    html = fetch(TEAM_URL.format(slug=slug))
    os.makedirs(RAW_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    time.sleep(0.6)  # be polite
    return html


def money(text: str | None) -> int | None:
    """'$58,456,566' -> 58456566 ; '$220.84M' -> 220840000 ; None on failure."""
    if not text:
        return None
    t = text.strip().replace("\u2212", "-").replace("\u2013", "-")
    m = re.search(r"(-?\$?\s*[\d,]+(?:\.\d+)?)\s*([MBK])?(?![\d])", t, re.I)
    if not m:
        return None
    raw = m.group(1).replace("$", "").replace(",", "").replace(" ", "")
    try:
        val = float(raw)
    except ValueError:
        return None
    if raw.startswith("-"):
        val = -abs(val)
    suffix = (m.group(2) or "").upper()
    mult = {"M": 1_000_000, "B": 1_000_000_000, "K": 1_000}.get(suffix, 1)
    return int(round(val * mult))


def num(text: str | None) -> float | None:
    if not text:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", text.replace("\u2212", "-"))
    return float(m.group(0)) if m else None


def txt(el) -> str:
    return el.get_text(" ", strip=True) if el else ""


# --------------------------------------------------------------------------- #
# parsing
# --------------------------------------------------------------------------- #

def parse_team(html: str, slug: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    out: dict[str, Any] = {"slug": slug}

    # ---- identity -------------------------------------------------------- #
    hero = soup.select_one(".nst-component-hero")
    h1 = soup.select_one(".nst-hero h1")
    name = txt(h1).replace(" Salaries", "").strip() if h1 else slug
    out["name"] = name
    out["abbr"] = ABBR.get(name, slug[:3].upper())

    meta = soup.select_one(".nst-meta")
    if meta:
        parts = [p.strip() for p in txt(meta).split("·")]
        out["conference"] = parts[0].replace("Conference", "").strip() if parts else ""
        out["division"] = parts[1].replace("Division", "").strip() if len(parts) > 1 else ""
    logo = soup.select_one(".nst-hero img")
    if logo and logo.get("src"):
        out["logo"] = logo["src"]
        m = re.search(r"/nba/(\d{10})/", logo["src"])
        if m:
            out["teamId"] = int(m.group(1))
    accent = None
    for el in soup.select("[style*='--nst-accent']"):
        m = re.search(r"--nst-accent:\s*(#[0-9A-Fa-f]{3,8})", el.get("style", ""))
        if m:
            accent = m.group(1)
            break
    if accent:
        out["color"] = accent

    # ---- headline metrics ------------------------------------------------ #
    metrics = soup.select_one(".nst-component-metrics")
    stats: dict[str, Any] = {}
    if metrics:
        for card in metrics.select(".nst-stats > div"):
            label = txt(card.select_one("span")).lower()
            value = txt(card.select_one("strong"))
            note = txt(card.select_one("small"))
            stats[label] = {"value": value, "note": note}
        note = txt(metrics.select_one(".nst-note"))
        m = re.search(r"snapshot:\s*(\d{4}-\d{2}-\d{2})", note)
        out["snapshotDate"] = m.group(1) if m else None
        m = re.search(r"^(\d{4})\u2013(\d{2})", note)
        out["season"] = f"{m.group(1)}-{m.group(2)}" if m else None

    def stat_value(*keys: str) -> str | None:
        for k, v in stats.items():
            if any(key in k for key in keys):
                return v["value"]
        return None

    out["payrollActive"] = money(stat_value("active cap payroll"))
    out["payrollCap"] = money(stat_value("incl. dead cap", "cap payroll incl"))
    out["capShare"] = num(stat_value("share of salary cap"))
    out["top3Share"] = num(stat_value("top-three"))
    rank_txt = (stats.get("active cap payroll") or {}).get("note", "")
    m = re.search(r"#(\d+)", rank_txt)
    out["rank"] = int(m.group(1)) if m else None
    delta = (stats.get("cap payroll incl. dead cap") or {}).get("note", "")  # fallback only
    m = re.search(r"([+\-−]\s*\$[\d.]+\s*[MBK])", delta)
    out["payrollDelta"] = money(m.group(1)) if m else None

    # ---- payroll history (chart payload) --------------------------------- #
    hist_el = soup.select_one("[data-history]")
    history: list[dict[str, Any]] = []
    if hist_el:
        try:
            history = json.loads(hist_el["data-history"])
        except json.JSONDecodeError:
            history = []
    out["history"] = history

    # ---- cap & tax ------------------------------------------------------- #
    cap = soup.select_one(".nst-component-cap")
    capinfo: dict[str, Any] = {}
    if cap:
        intro = txt(cap.select_one("p"))
        m = re.search(
            r"standard roster accounts for \$([\d.]+)M\. Add \$([\d.]+)M in dead cap to reach \$([\d.]+)M",
            intro,
        )
        if m:
            capinfo["rosterPayroll"] = money(m.group(1) + "M")
            capinfo["deadCap"] = money(m.group(2) + "M")
            capinfo["payrollBeforeHolds"] = money(m.group(3) + "M")
        implied: dict[str, int] = {}
        for cell in cap.select(".nst-threshold-grid > div"):
            key = txt(cell.select_one("h3"))
            strong = txt(cell.select_one("strong"))
            pos_txt = txt(cell.select_one("p"))
            pos = pos_txt.split("Using")[0].strip()
            basis = pos_txt.split("Using")[-1].strip() if "Using" in pos_txt else ""
            capinfo[key] = {"amount": money(strong), "position": pos, "basis": basis}
            m2 = re.search(r"\$([\d.,]+)\s*M\s*(above|below)", pos)
            if m2:
                delta = money(m2.group(1) + "M")
                capinfo[key]["delta"] = delta if m2.group(2) == "above" else -delta
                implied[key] = m2.group(2)
        tax_panel = cap.select_one(".nst-tax-panel")
        if tax_panel:
            capinfo["estimatedTax"] = money(txt(tax_panel.select_one(".nst-tax-summary strong")))
            capinfo["taxBasis"] = txt(tax_panel.select_one(".nst-tax-summary span"))
            capinfo["taxNote"] = txt(tax_panel.select("p")[1]) if len(tax_panel.select("p")) > 1 else ""
            seasons = []
            for span in tax_panel.select(".nst-tax-history span"):
                b = txt(span.select_one("b")).replace("\u2013", "-")
                status = txt(span).replace(txt(span.select_one("b")), "").strip()
                seasons.append({"season": b, "status": status})
            capinfo["taxHistory"] = seasons
            prev4 = seasons[-4:]
            capinfo["taxpayerPrev4"] = sum(1 for x in prev4 if "taxpayer" in x["status"].lower())
            capinfo["repeater"] = capinfo["taxpayerPrev4"] >= 3
        notes = " ".join(txt(n) for n in cap.select(".nst-note"))
        m = re.search(r"Cap holds:\s*\$([\d.]+)M", notes)
        capinfo["capHolds"] = money(m.group(1) + "M") if m else 0
        m = re.search(r"reviewed\s*(\d{4}-\d{2}-\d{2})", notes)
        if m:
            capinfo["reviewed"] = m.group(1)

    # exact payrolls live in the history payload (cap + cash)
    cur = next((h for h in history if h.get("season") == out.get("season")), None)
    prev = history[-2] if len(history) > 1 else None
    if cur and prev and cur.get("payroll") and prev.get("payroll"):
        out["payrollDelta"] = cur["payroll"] - prev["payroll"]
        out["prevSeason"] = prev["season"]
        out["prevPayroll"] = prev["payroll"]
    if cur:
        if cur.get("payroll"):
            out["payrollCap"] = cur["payroll"]
        if cur.get("cash"):
            out["payrollCash"] = cur["cash"]
        out["lineCap"] = cur.get("cap")
        out["lineTax"] = cur.get("tax")

    # snap thresholds to the official league figures, then re-derive the
    # implied tax / apron salary from the recorded distance to each line
    lines = LEAGUE_LINES.get(out.get("season") or "", {})
    for label, key in (("Salary Cap", "cap"), ("Luxury-Tax Line", "tax"),
                       ("First Apron", "apron1"), ("Second Apron", "apron2")):
        cell = capinfo.get(label)
        if isinstance(cell, dict) and lines.get(key):
            cell["amount"] = lines[key]
            if cell.get("delta") is not None:
                cell["implied"] = lines[key] + cell["delta"]
    tax_cell = capinfo.get("Luxury-Tax Line") or {}
    apron_cell = capinfo.get("First Apron") or {}
    capinfo["taxSalary"] = tax_cell.get("implied")
    capinfo["apronSalary"] = apron_cell.get("implied")

    # prose fallback ("tax salary is $1.71 million below the ... line")
    if capinfo.get("taxSalary") is None or capinfo.get("apronSalary") is None:
        prose = " ".join(txt(el) for el in soup.select("#team-cap .bde-shortcode p"))
        m = re.search(r"tax salary is \$([\d.]+) million (below|above) the", prose)
        if m and tax_cell.get("amount") and capinfo.get("taxSalary") is None:
            d = money(m.group(1) + "M")
            capinfo["taxSalary"] = tax_cell["amount"] - d if m.group(2) == "below" else tax_cell["amount"] + d
        m = re.search(r"apron salary sits \$([\d.]+) million (under|below|above|over) the", prose)
        if m and apron_cell.get("amount") and capinfo.get("apronSalary") is None:
            d = money(m.group(1) + "M")
            capinfo["apronSalary"] = (
                apron_cell["amount"] - d if m.group(2) in ("under", "below") else apron_cell["amount"] + d
            )
    out["cap"] = capinfo

    # ---- roster table ---------------------------------------------------- #
    roster_tbl = soup.select_one(".nlt-roster table") or (soup.select_one("table"))
    players: list[dict[str, Any]] = []
    if roster_tbl:
        rows = roster_tbl.select("tbody > tr")
        i = 0
        while i < len(rows):
            row = rows[i]
            if "nlt-detail" in (row.get("class") or []):
                i += 1
                continue
            cells = row.find_all(["td", "th"], recursive=False)
            if len(cells) < 8:
                i += 1
                continue
            pcell = cells[1]
            link = pcell.select_one("a[href*='/players/']")
            pname = txt(pcell)
            pname = re.sub(r"\s*\([A-Z]\)\s*[A-Z\-/]*$", "", pname).strip()
            # position letter sits in its own span / trailing token
            pos_m = re.search(r"\(([A-Z\-/]+)\)", txt(pcell))
            p: dict[str, Any] = {
                "rank": num(txt(cells[0])),
                "name": pname,
                "pos": pos_m.group(1) if pos_m else None,
                "team": txt(cells[2]),
                "salary": money(txt(cells[3]).split("▲")[0].split("▼")[0]),
                "capShare": num(txt(cells[4]).split("▲")[0].split("▼")[0]),
                "age": num(txt(cells[5])),
                "contractThrough": re.sub(r"\s*(PO|TO|OPT|ETO)\s*$", "", txt(cells[6])).strip(),
                "careerEarnings": money(txt(cells[7])),
            }
            if link and link.get("href"):
                p["slug"] = link["href"].rstrip("/").split("/")[-1]

            # detail row (dl of key/values) follows
            det = rows[i + 1] if i + 1 < len(rows) else None
            if det is not None and "nlt-detail" in (det.get("class") or []):
                kv = {}
                for div in det.select("dl > div"):
                    dt, dd = div.select_one("dt"), div.select_one("dd")
                    if dt and dd:
                        kv[txt(dt)] = txt(dd)
                def mv(*keys):
                    for k in kv:
                        if any(key.lower() in k.lower() for key in keys):
                            return kv[k]
                    return None

                p["salaryPrev"] = money(mv("Salary 2025", "Salary 2024"))
                p["capHit"] = money(mv("Cap Hit"))
                p["teamPayrollShare"] = num(mv("Share of Team Payroll"))
                p["position"] = mv("Position")
                p["height"] = mv("Height")
                p["country"] = mv("Nationality")
                p["contractValue"] = money(mv("Contract Value"))
                p["guaranteed"] = money(mv("Guaranteed"))
                p["contractType"] = mv("Contract Type")
                p["option"] = mv("Option")
                p["freeAgency"] = num(mv("Free Agency"))
                p["careerEarnings"] = money(mv("Career Earnings")) or p["careerEarnings"]
                p["netWorth"] = money(mv("Net Worth"))
                if p.get("salary") is not None and p.get("salaryPrev") is not None:
                    p["salaryDelta"] = p["salary"] - p["salaryPrev"]
                i += 2
            else:
                i += 1
            players.append(p)
    out["players"] = players

    # ---- future commitments table --------------------------------------- #
    tables = soup.select("table")
    future_tbl = None
    for t in tables:
        head = [txt(x) for x in t.select("thead th, thead td")]
        if head and head[0].lower() == "player" and len(head) > 2:
            future_tbl = t
            future_years = [h for h in head[1:]]
            break
    future: dict[str, Any] = {"years": [], "rows": [], "totals": {}}
    if future_tbl:
        future["years"] = future_years
        for tr in future_tbl.select("tbody > tr"):
            cells = tr.find_all(["td", "th"], recursive=False)
            if len(cells) < 2:
                continue
            label = txt(cells[0])
            is_total = "total" in label.lower()
            row = {"label": label, "total": is_total, "cells": []}
            pos_m = re.search(r"\s(PG|SG|SF|PF|C|G|F|C-F|F-C|G-F|F-G)$", label)
            row["player"] = label[: pos_m.start()].strip() if pos_m else label
            row["pos"] = pos_m.group(1) if pos_m else None
            for c in cells[1:]:
                ct = txt(c)
                # prefer the exact dollar figure ("$2,406,205 scheduled cap charge")
                exact = re.findall(r"\$([\d,]{7,})", ct)
                v = int(exact[0].replace(",", "")) if exact else money(ct.split("scheduled")[0])
                opt = "PO" if re.search(r"\bPO\b", ct) else ("TO" if re.search(r"\bTO\b", ct) else None)
                row["cells"].append({"amount": v, "option": opt})
            if is_total:
                for yr, cell in zip(future_years, row["cells"]):
                    future["totals"][yr] = cell["amount"]
            else:
                future["rows"].append(row)

        # league-wide scheduled payroll rankings, one card per future season
        rankings: dict[str, list[dict[str, Any]]] = {}
        for card in soup.select(".nst-component-future .nst-future-card"):
            summary = card.select_one("summary")
            if not summary:
                continue
            season = txt(summary.select_one("span")).replace("\u2013", "-")
            entries = []
            for li in card.select("ol > li"):
                a = li.select_one("a")
                entries.append(
                    {
                        "name": txt(a) if a else txt(li),
                        "slug": a["href"].rstrip("/").split("/")[-1] if a and a.get("href") else None,
                        "payroll": money(txt(li.select_one("b"))),
                        "current": "is-current" in (li.get("class") or []),
                    }
                )
            rankings[season] = {
                "teamTotal": money(txt(summary.select_one("strong"))),
                "rank": num(txt(summary.select_one("b"))),
                "teams": entries,
            }
        future["rankings"] = rankings
    out["future"] = future

    # ---- league comparison (all 30 teams) -------------------------------- #
    peers = []
    for a in soup.select("#team-peers .nlp-row"):
        peers.append(
            {
                "rank": num(txt(a.select_one(".nlp-rank"))),
                "name": txt(a.select_one(".nlp-name")),
                "slug": a["href"].rstrip("/").split("/")[-1] if a.get("href") else None,
                "payroll": money(txt(a.select_one(".nlp-val b"))),
                "logo": a.select_one("img").get("src") if a.select_one("img") else None,
                "color": (re.search(r"--card-color:\s*(#[0-9A-Fa-f]{3,8})", a.get("style", "")) or [None, None])[1]
                if a.get("style")
                else None,
            }
        )
    out["peers"] = peers

    # ---- contract-length / era prose (kept as flavour text) -------------- #
    for sec_id, key in (("team-contracts", "contractNote"), ("team-eras", "eraNote")):
        sec = soup.select_one(f"#{sec_id}")
        if sec:
            body = txt(sec.select_one(".bde-shortcode"))
            out[key] = re.sub(r"\s+", " ", body).strip()[:1200]

    return out


ABBR = {
    "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
    "LA Clippers": "LAC", "Los Angeles Clippers": "LAC", "Los Angeles Lakers": "LAL",
    "Memphis Grizzlies": "MEM", "Miami Heat": "MIA", "Milwaukee Bucks": "MIL",
    "Minnesota Timberwolves": "MIN", "New Orleans Pelicans": "NOP", "New York Knicks": "NYK",
    "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI",
    "Phoenix Suns": "PHX", "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC",
    "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR", "Utah Jazz": "UTA",
    "Washington Wizards": "WAS",
}


def team_slugs(offline: bool) -> list[str]:
    path = os.path.join(RAW_DIR, "_home.html")
    if os.path.exists(path) and offline:
        html = open(path, encoding="utf-8", errors="replace").read()
    elif os.path.exists(path) and time.time() - os.path.getmtime(path) < 12 * 3600:
        html = open(path, encoding="utf-8", errors="replace").read()
    else:
        html = fetch(HOME_URL)
        os.makedirs(RAW_DIR, exist_ok=True)
        open(path, "w", encoding="utf-8").write(html)
    slugs = sorted(set(re.findall(r"nbasalaries\.com/teams/([a-z0-9\-]+)/", html)))
    if len(slugs) < 30:
        raise SystemExit(f"only found {len(slugs)} team slugs, aborting")
    return slugs


# --------------------------------------------------------------------------- #
# league rollup
# --------------------------------------------------------------------------- #

LEAGUE_LINES = {
    "2022-23": {"cap": 123_655_000, "tax": 150_267_000, "apron1": 150_267_000, "apron2": None,
                "floor": 111_290_000, "mleNonTax": 10_490_000, "mleTax": 6_392_000},
    "2023-24": {"cap": 136_021_000, "tax": 165_294_000, "apron1": 172_346_000, "apron2": 182_525_000,
                "floor": 122_419_000, "mleNonTax": 12_405_000, "mleTax": 5_000_000},
    "2024-25": {"cap": 140_588_000, "tax": 170_814_000, "apron1": 178_132_000, "apron2": 188_931_000,
                "floor": 126_529_000, "mleNonTax": 12_825_000, "mleTax": 5_168_000},
    "2025-26": {"cap": 154_647_000, "tax": 187_895_000, "apron1": 195_954_000, "apron2": 207_824_000,
                "floor": 139_182_000, "mleNonTax": 14_104_000, "mleTax": 5_685_000,
                "roomMle": 8_781_000, "bae": 5_134_000},
    "2026-27": {"cap": 164_961_000, "tax": 200_428_000, "apron1": 209_015_000, "apron2": 221_686_000,
                "floor": 148_465_000, "mleNonTax": 15_044_000, "mleTax": 6_064_000,
                "roomMle": 9_366_000, "bae": 5_477_000,
                "twoWay": 678_882, "earlyBird": 15_235_500, "estAvgSalary": 15_163_000,
                "max0_6": 41_240_250, "max7_9": 49_488_300, "max10": 57_736_350,
                "tradeCashLimit": 8_495_000, "exhibit10Max": 91_000,
                "expandedTpe": 9_096_000},
}


def build_league(teams: list[dict[str, Any]], season: str) -> dict[str, Any]:
    lines = LEAGUE_LINES.get(season, {})
    peers: dict[str, dict[str, Any]] = {}
    for t in teams:
        for p in t.get("peers") or []:
            if p.get("slug"):
                peers[p["slug"]] = p
    return {
        "season": season,
        "lines": lines,
        "history": LEAGUE_LINES,
        "allTeams": sorted(peers.values(), key=lambda p: p["rank"] or 99),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--team", action="append", default=[])
    args = ap.parse_args()

    slugs = args.team or team_slugs(args.offline)
    teams: list[dict[str, Any]] = []
    for n, slug in enumerate(slugs, 1):
        try:
            html = cached_fetch(slug, args.offline)
            t = parse_team(html, slug)
            teams.append(t)
            print(f"[{n}/{len(slugs)}] {slug:28s} payroll={t.get('payrollActive')} players={len(t.get('players', []))}")
        except Exception as exc:  # noqa: BLE001
            print(f"[{n}/{len(slugs)}] {slug} FAILED: {exc}", file=sys.stderr)

    season = next((t.get("season") for t in teams if t.get("season")), None)
    if season is None and teams and teams[0].get("history"):
        season = teams[0]["history"][-1]["season"]

    os.makedirs(DATA_DIR, exist_ok=True)
    teams.sort(key=lambda t: (t.get("rank") or 999))
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "nbasalaries.com (roster/cap snapshot) + NBA official cap figures",
        "season": season,
        "teams": teams,
    }
    with open(os.path.join(DATA_DIR, "teams.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)

    league = build_league(teams, season)
    league["generatedAt"] = payload["generatedAt"]
    league["snapshotDate"] = next((t.get("snapshotDate") for t in teams if t.get("snapshotDate")), None)
    with open(os.path.join(DATA_DIR, "league.json"), "w", encoding="utf-8") as fh:
        json.dump(league, fh, ensure_ascii=False, indent=1)

    print(f"\nwrote {len(teams)} teams -> data/teams.json, data/league.json (season {season})")


if __name__ == "__main__":
    main()
