#!/usr/bin/env python3
"""Fetch recent NBA transactions + headlines from ESPN's public JSON API.

Outputs data/app/news.json:
  { fetchedAt, cutoff, items: [{date, abbr, slug, teamName, category, text}],
    headlines: [{title, desc, url, published}] }

Categories:
  trade    - traded / trade talk confirmed by a move
  signing  - signed / re-signed / extension agreed
  twoWay   - two-way, 10-day, exhibit-10 contracts
  waiver   - waived / released
  claim    - claimed off waivers
  other    - anything else (retirement, coaching, league notices…)

Fault-tolerant by design: on any upstream failure the previous news.json is kept
and the script exits 0 so builds never break.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "data", "app", "news.json")
LEAGUE = os.path.join(ROOT, "data", "app", "league.json")

TX_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/transactions?page={page}"
NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news"

ABBR_FIX = {"SA": "SAS", "WSH": "WAS", "NO": "NOP", "NY": "NYK", "BK": "BKN", "GS": "GSW", "UTAH": "UTA"}
KEEP_DAYS = 45
MAX_PAGES = 14


def get(url: str, timeout: int = 30):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def categorize(text: str) -> str:
    t = text.lower()
    if "two-way" in t or "10-day" in t or "exhibit 10" in t:
        return "twoWay"
    if t.startswith("traded") or " traded " in f" {t} " or "trade for" in t:
        return "trade"
    if "claimed" in t:
        return "claim"
    if "waived" in t or "released" in t:
        return "waiver"
    if "sign" in t or "extension" in t or "agreed to" in t or "contract" in t:
        return "signing"
    return "other"


def main() -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=KEEP_DAYS)
    slugs: dict[str, str] = {}
    names: dict[str, str] = {}
    try:
        with open(LEAGUE, encoding="utf-8") as f:
            for t in json.load(f)["teams"]:
                slugs[t["abbr"]] = t["slug"]
                names[t["abbr"]] = t["name"]
    except Exception as e:  # noqa: BLE001
        print(f"[news] league.json unreadable ({e}); team links disabled")

    items: list[dict] = []
    try:
        for page in range(1, MAX_PAGES + 1):
            d = get(TX_URL.format(page=page))
            txs = d.get("transactions") or []
            if not txs:
                break
            stop = False
            for tx in txs:
                raw_date = tx.get("date") or ""
                try:
                    dt = datetime.strptime(raw_date[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
                if dt < cutoff:
                    stop = True
                    break
                team = tx.get("team") or {}
                abbr = ABBR_FIX.get(team.get("abbreviation"), team.get("abbreviation")) or ""
                text = re.sub(r"\s+", " ", tx.get("description") or "").strip()
                if not text:
                    continue
                items.append(
                    {
                        "date": raw_date[:10],
                        "abbr": abbr,
                        "slug": slugs.get(abbr),
                        "teamName": names.get(abbr, team.get("displayName") or abbr),
                        "category": categorize(text),
                        "text": text,
                    }
                )
            if stop or page >= int(d.get("pageCount") or page):
                break
            time.sleep(0.4)
    except Exception as e:  # noqa: BLE001
        print(f"[news] transactions fetch stopped early: {e}")

    headlines: list[dict] = []
    try:
        d = get(NEWS_URL)
        for a in (d.get("articles") or [])[:10]:
            url = ((a.get("links") or {}).get("web") or {}).get("href") or ""
            title = (a.get("headline") or "").strip()
            if not title or not url:
                continue
            headlines.append(
                {
                    "title": title,
                    "desc": re.sub(r"\s+", " ", a.get("description") or "").strip()[:220],
                    "url": url,
                    "published": (a.get("published") or "")[:10],
                }
            )
    except Exception as e:  # noqa: BLE001
        print(f"[news] headlines fetch failed: {e}")

    if not items and not headlines:
        print("[news] nothing fetched -> keeping previous news.json")
        return 0

    doc = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cutoffDays": KEEP_DAYS,
        "items": items,
        "headlines": headlines,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False)
    cats = {}
    for i in items:
        cats[i["category"]] = cats.get(i["category"], 0) + 1
    print(f"[news] wrote {len(items)} transactions {cats} + {len(headlines)} headlines -> data/app/news.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
