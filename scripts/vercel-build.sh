#!/usr/bin/env bash
# Build entrypoint used on Vercel (project buildCommand = "bash scripts/vercel-build.sh").
# Re-scrapes the upstream source at build time so every deployment ships the newest
# snapshot. Every step is fault-tolerant: if the upstream is unreachable or deps
# cannot be installed, the bundled data/app/*.json is used and the build succeeds.
set -u

PY=python3
if command -v uv >/dev/null 2>&1; then
  echo "[vercel-build] using uv venv for python deps"
  if uv venv /tmp/scrapeenv >/dev/null 2>&1 && uv pip install --python /tmp/scrapeenv/bin/python --quiet requests beautifulsoup4 lxml; then
    PY=/tmp/scrapeenv/bin/python
  else
    echo "[vercel-build] uv venv failed -> system python"
  fi
else
  python3 -m venv /tmp/scrapeenv 2>/dev/null && /tmp/scrapeenv/bin/pip install --quiet --disable-pip-version-check requests beautifulsoup4 lxml && PY=/tmp/scrapeenv/bin/python
fi

echo "[vercel-build] python: $($PY --version 2>&1 || echo missing)"

$PY scripts/scrape_teams.py    || echo "[vercel-build] scrape_teams failed -> keeping bundled data"
$PY scripts/fetch_standings.py || echo "[vercel-build] fetch_standings failed -> keeping bundled records"
$PY scripts/fetch_news.py       || echo "[vercel-build] fetch_news failed -> keeping bundled news"
$PY scripts/build_data.py      || echo "[vercel-build] build_data failed -> keeping bundled app data"

npx next build
