import { NextResponse } from "next/server";
import { league, news as bundled } from "@/lib/data";
import type { NewsDoc } from "@/lib/types";

/**
 * Live news endpoint: re-fetches ESPN transactions + headlines at most once
 * per TTL per server instance. On any upstream failure it degrades to the
 * bundled snapshot so the tab never breaks (user requirement: no hard
 * runtime dependency on external APIs).
 */

const TXN_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/transactions?page=";
const HEAD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
/** ESPN sometimes uses non-standard abbreviations; mirror scripts/fetch_news.py */
const ABBR_FIX: Record<string, string> = {
  SA: "SAS",
  WSH: "WAS",
  NO: "NOP",
  NY: "NYK",
  BK: "BKN",
  GS: "GSW",
  UTAH: "UTA",
};
const KEEP_DAYS = 45;
const TTL_MS = 6 * 60 * 60 * 1000; // refresh at most every 6h per instance
const MAX_PAGES = 10;

type LiveDoc = NewsDoc & { source: "live" | "bundled" };

let cache: { at: number; doc: LiveDoc } | null = null;

function categorize(text: string): NewsDoc["items"][number]["category"] {
  const t = text.toLowerCase();
  if (t.includes("two-way") || t.includes("10-day") || t.includes("exhibit 10")) return "twoWay";
  if (t.startsWith("traded") || t.includes(" traded ") || t.includes("trade for")) return "trade";
  if (t.includes("claimed")) return "claim";
  if (t.includes("waived") || t.includes("released")) return "waiver";
  if (t.includes("sign") || t.includes("extension") || t.includes("agreed to") || t.includes("contract"))
    return "signing";
  return "other";
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return res.json();
}

async function buildLive(): Promise<LiveDoc> {
  const slugByAbbr = new Map(league.teams.map((t) => [t.abbr, t.slug]));
  const nameByAbbr = new Map(league.teams.map((t) => [t.abbr, t.name]));
  const cutoff = Date.now() - KEEP_DAYS * 86400_000;

  const items: NewsDoc["items"] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = (await getJson(TXN_URL + page)) as {
      transactions?: { date: string; description: string; team?: { abbreviation?: string } }[];
    };
    const tx = data.transactions ?? [];
    if (!tx.length) break;
    let stop = false;
    for (const x of tx) {
      const day = (x.date ?? "").slice(0, 10);
      if (!day || Date.parse(day) < cutoff) {
        stop = true;
        continue;
      }
      const abbr = ABBR_FIX[x.team?.abbreviation ?? ""] ?? (x.team?.abbreviation ?? "");
      items.push({
        date: day,
        category: categorize(x.description ?? ""),
        abbr,
        slug: slugByAbbr.get(abbr) ?? "",
        teamName: nameByAbbr.get(abbr) ?? abbr,
        text: x.description ?? "",
      });
    }
    if (stop) break;
  }
  if (!items.length) throw new Error("no transactions parsed");

  let headlines: NewsDoc["headlines"] = [];
  try {
    const hd = (await getJson(HEAD_URL)) as {
      articles?: { headline?: string; description?: string; published?: string; links?: { web?: { href?: string } } }[];
    };
    headlines = (hd.articles ?? []).slice(0, 6).map((a) => ({
      title: a.headline ?? "",
      desc: a.description ?? a.headline ?? "",
      published: (a.published ?? "").slice(0, 10),
      url: a.links?.web?.href ?? "#",
    }));
  } catch {
    headlines = bundled.headlines;
  }

  items.sort((a, b) => b.date.localeCompare(a.date));
  return {
    source: "live",
    fetchedAt: new Date().toISOString(),
    cutoffDays: KEEP_DAYS,
    items,
    headlines,
  };
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.doc, { headers: { "Cache-Control": "no-store" } });
  }
  let doc: LiveDoc;
  try {
    doc = await buildLive();
    cache = { at: Date.now(), doc };
  } catch {
    doc = { ...bundled, source: "bundled" };
  }
  return NextResponse.json(doc, { headers: { "Cache-Control": "no-store" } });
}
