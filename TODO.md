# TODO (Tower-of-Hanoi Style)

Progression is structured in tiers; only move to the next tier once the minimal slice of the current tier is complete. Items checked are done.

## Tier 1 — Foundation (this tier focuses on build/test/standards)
- [x] Monorepo scaffolding (npm workspaces)
- [x] `packages/game-sim` with TypeScript + Vitest
- [x] Deterministic RNG util and a passing test
- [x] CI workflow (install, build, test)
- [x] Task runner basics (`Taskfile.yml`)
- [x] Linting + formatting baseline (eslint, prettier)

## Tier 2 — Game Simulation Core (server-authoritative logic in TS)
- [x] Define core types: `Card`, `Deck`, `MatchState` with docs
- [x] Action schema via `zod` (intents → state diffs)
- [x] Deterministic simulator loop (seeded)
- [x] Replay 100 seeded actions with deterministic equality
- [ ] Golden-master snapshot harness
- [ ] Property-based tests on effect DSL (fast-check)

## Tier 3 — Backend API (Next.js)
- [ ] Next.js app + API routes scaffold
- [ ] Drizzle + Postgres schema (cards, decks, users)
- [ ] Auth (OAuth providers) + JWT for game sessions
- [ ] Redis queue + basic matchmaking endpoint
- [ ] WebSocket endpoint for match state
- [ ] Integration tests (Supertest)

## Tier 4 — Godot Client
- [ ] Godot project skeleton + scenes (`GameRoot`, `Board`, `Hand`)
- [ ] WebSocket client and local intent queue
- [ ] HTML5 export; `/play` route integration
- [ ] GUT unit tests

## Tier 5 — E2E and Ops
- [ ] Playwright smoke (login, deck edit, `/play` loads)
- [ ] E2E PvP bot-vs-bot
- [ ] E2E PvE seeded run
- [ ] Docker compose (db, redis, worker)
- [ ] Observability stubs (metrics/logs)

## Tier 6 — Content & Live-Ops
- [ ] Card content pipeline (json validation, ids, sets)
- [ ] Admin balance toggles + hot reload
- [ ] Daily patch script + automated changelog

Notes:
- Keep tiers thin; if blocked, split the item and finish a thinner slice first.
- Always keep tests green before moving a card to the next tier.
