#!/usr/bin/env bash
# One-command refresh + publish:
#   VERCEL_TOKEN=vcp_... scripts/deploy.sh
# 1. re-scrapes nbasalaries.com / ESPN          (npm run scrape)
# 2. rebuilds the app with the fresh data       (npm run build)
# 3. deploys to Vercel production               (vercel --prod)
#
# Note: Vercel builds also re-run the scraper themselves (scripts/vercel-build.sh),
# so even a plain `vercel --prod` without step 1 ships the newest upstream snapshot.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${VERCEL_TOKEN:?set VERCEL_TOKEN (Vercel API token) before deploying}"

echo "==> 1/3 scrape latest data"
npm run scrape

echo "==> 2/3 build"
npm run build

echo "==> 3/3 deploy to production"
npx -y vercel@latest deploy --prod --yes

echo "==> done: https://nba-salary-tracker.vercel.app"
