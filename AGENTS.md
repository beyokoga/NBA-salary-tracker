<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project handoff for coding agents

Before doing any work in this repository, read:

- `docs/HANDOFF.md` — current product state, deployment/data flow, blockers, and handoff notes
- `docs/ROADMAP.md` — feature status and next priorities
- `docs/CODEX_START_PROMPT.md` — copy-paste kickoff prompt for Codex

Project rules:

- Production is https://nba-salary-tracker.vercel.app and the GitHub repo is `beyokoga/NBA-salary-tracker`.
- GitHub `main` is connected to Vercel. Changes that reach `main` can deploy automatically.
- Before editing Next.js code, follow the Next.js agent rules above and read the relevant docs in `node_modules/next/dist/docs/`.
- Run `npm run lint` and `npm run build` after code changes.
- For UI changes, verify both desktop and a 390px mobile viewport, including no horizontal overflow.
- Use the Japanese term 「エプロン」 for apron. Do not use 「アプロン」.
- Never commit secrets, personal access tokens, Vercel tokens, or deploy hook URLs.
- When feature status changes, update `docs/HANDOFF.md` and `docs/ROADMAP.md` in the same change.
