import { NextResponse } from "next/server";
import { league } from "@/lib/data";

/**
 * Public freshness probe: compares the snapshot date baked into this build with
 * the date currently published by the upstream source (nbasalaries.com).
 * `stale: true` means a newer snapshot exists and a redeploy would pick it up
 * (Vercel builds re-run the scraper via scripts/vercel-build.sh).
 */

const SOURCE_TEAM_PAGE = "https://nbasalaries.com/teams/golden-state-warriors/";
const TTL_MS = 6 * 60 * 60 * 1000;

let cache: { at: number; source: string | null } | null = null;

async function sourceSnapshot(): Promise<string | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.source;
  let source: string | null = null;
  try {
    const res = await fetch(SOURCE_TEAM_PAGE, { next: { revalidate: 0 } });
    const html = await res.text();
    const m = html.match(/snapshot[^<]{0,60}?(\d{4}-\d{2}-\d{2})/i);
    source = m ? m[1] : null;
  } catch {
    source = null;
  }
  cache = { at: Date.now(), source };
  return source;
}

export async function GET() {
  const source = await sourceSnapshot();
  const baked = league.rosterSnapshot;
  return NextResponse.json(
    {
      season: league.season,
      bakedSnapshot: baked,
      sourceSnapshot: source,
      stale: source !== null && baked !== null && source > baked,
      checkedAt: new Date().toISOString(),
      note: "Redeploys re-scrape the source at build time (scripts/vercel-build.sh).",
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
