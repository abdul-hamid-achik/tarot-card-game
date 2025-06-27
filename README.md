# Tarot-Themed Digital TCG (Monorepo)

Quick start
- Install: `npm install --ignore-scripts`
- Build all: `npm run build`
- Run web dev: `npm run dev:web`
- Run game-sim tests: `npm run test`

Workspaces
- `packages/game-sim`: Deterministic server-authoritative simulator (TS + Vitest)
- `packages/db`: Drizzle ORM schema scaffold
- `apps/web`: Next.js app + API stubs (cards, decks, auth session, redis ping, match queue/start, demo)

Endpoints (web)
- `GET /api/health` – health check
- `GET /api/cards`, `GET /api/decks` – mock data
- `POST /api/match/queue` – enqueue matchmaking (in-memory); returns current result if ready
- `POST /api/match/start` – run a seeded headless match and return summary
- `POST /api/demo/headless` – demo runner for headless match
- `GET /api/auth/session` – mock session
- `GET /api/redis/ping` – stub ping

Simulator
- Deterministic RNG, intents (`draw`, `play_card`, `end_turn`), resources ramp, basic victory check, effects (`gain`, `both_discard_random`, `silence` placeholder)
- Tests: unit, property, golden timeline, long-run determinism, bot-vs-bot

Scripts
- `npm run build` – builds sim, db, and web
- `npm run dev:web` – runs `@tarot/web` Next.js dev server
- `npm run test` – runs game-sim tests (see web E2E note below)

E2E (manual)
- In one terminal: `npm run dev:web`
- In another: `npx -w @tarot/web playwright test`

Notes
- This repo uses small, focused commits for clarity.
- Web imports `@tarot/game-sim` from built `dist` for API routes.
