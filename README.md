# Tarot-Themed Digital TCG (Monorepo)

Quick start
- Install: `npm install --ignore-scripts`
- Build all: `npm run build`
- Run web dev: `npm run dev:web`
- Run game-sim tests: `npm run test`

Workspaces
- `packages/game-sim`: Deterministic server-authoritative simulator (TS + Vitest)
- `packages/db`: Drizzle ORM schema scaffold
- `apps/web`: Next.js app + API stubs (cards, decks, auth session, redis ping, match queue/start/result, demo stream)

Endpoints (web)
- `GET /api/health` – health check
- `GET /api/cards`, `GET /api/decks` – DB-backed (in-memory sqlite)
- `POST /api/match/queue` – enqueue matchmaking (in-memory)
- `GET /api/match/result?userId` – poll match result
- `POST /api/match/start` – run a seeded headless match and return summary
- `POST /api/admin/seed-deck` – seed a demo deck
- `POST /api/admin/seed-cards` – seed demo cards from `apps/web/data/cards.json`
- `POST /api/admin/reset-db` – reset in-memory DB to initial seed
- `GET /api/match/stream` – SSE match step stream (sim replay)

Simulator
- Deterministic RNG, intents, resources ramp, victory check, effects (`gain`, `both_discard_random`, `silence` placeholder)
- Tests: unit, property, golden timeline, long-run determinism, bot-vs-bot

E2E (manual)
- In one terminal: `npm run dev:web`
- In another: `npx -w @tarot/web playwright test`

Notes
- Small, focused commits; `TODO.md` maintained as the plan.
 - Docs live in `docs/` — start at `docs/index.md`. Gameplay canon: `GAMEPLAY.md`. Technical plan: `PLAN.md`.
