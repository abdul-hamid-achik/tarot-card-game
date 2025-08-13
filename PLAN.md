# Technical Documentation: Tarot-Themed Digital TCG

## 1. Overview

This document outlines the technical design, architecture, and implementation plan for a tarot-themed collectible card game (TCG) built using **Godot** for the game client and **Next.js** for the backend and website. The game will be fully digital, with server-authoritative logic to ensure fairness, anti-cheat protection, and scalability. We will work in a “vibecoding” mode without strict weekly roadmaps, iterating continuously towards a Minimum Viable Product (MVP) while implementing unit tests, integration tests, and end-to-end tests from the start.

---

## 2. High-Level Architecture

**Core components:**

* **Godot Client** (gameplay, UI, animations)
* **Next.js Backend** (API, matchmaking, player data, economy)
* **PostgreSQL Database** (persistent storage)
* **Redis** (real-time state caching, matchmaking queues, presence)
* **WebSockets** (real-time game state sync)

**Flow:**

1. User logs in via Next.js authentication.
2. Decks, card collections, and match requests are fetched from the backend.
3. Game client connects via WebSocket to a game session.
4. Server validates all moves, resolves RNG, and broadcasts updated state.

---

## 3. Data Models

### 3.1 Card

```json
{
  "id": "swords_02",
  "name": "two of swords",
  "suit": "swords",
  "cost": 2,
  "type": "spell|unit|artifact",
  "upright": { "effect": "silence(target,1)" },
  "reversed": { "effect": "both_discard_random(1)" },
  "tags": ["control", "discard"],
  "rarity": "common",
  "set": "base"
}
```

### 3.2 Deck

```json
{
  "id": "deck_123",
  "owner_id": "u_abc",
  "cards": ["swords_02", "cups_05"],
  "majors": ["death_13"],
  "format": "standard|wild|pve"
}
```

### 3.3 Match

```json
{
  "match_id": "m_456",
  "seed": "a1b2c3",
  "players": ["u_abc", "u_xyz"],
  "turn": 7,
  "fate": {"u_abc": 3, "u_xyz": 1},
  "stacks": {},
  "battlefield": {},
  "hands": {}
}
```

---

## 4. Backend (Next.js)

* **Stack**: Next.js (API routes + frontend), Postgres (via Drizzle ORM), Redis, WebSockets.
* **Auth**: OAuth (Google, Apple, Steam) + JWT for game sessions.
* **Testing**: Jest + Supertest for API, Vitest for shared libs, Playwright/Cypress for E2E.
* **Endpoints**:

  * `/api/cards`, `/api/decks`, `/api/match/queue`, `/api/craft`, `/api/season/*`
  * WebSocket endpoints for real-time match state.

---

## 5. Game Client (Godot)

* **Scenes**: `GameRoot`, `Board`, `Hand`, `CardView`, `FxDirector`.
* **Networking**: `WebSocketClient` → server-authoritative match handler.
* **Testing**: Godot GUT (Godot Unit Test) for isolated systems, replay testing for match states.
* **Export Targets**: HTML5 (web), native desktop (mac/win/linux), mobile optional.

---

## 6. Matchmaking System

* Redis queue.
* On match found, assign match\_id and session.
* Server match handler (Node.js worker or containerized service).

---

## 7. Server-Authoritative Logic

* All actions validated server-side.
* Deterministic RNG seeds.
* State persisted in Redis.

---

## 8. Security & Anti-Cheat

* Deck hash validation.
* Obfuscated asset IDs.
* WebSocket rate limiting.

---

## 9. Live-Ops & Balance

* Card balancing via admin dashboard.
* Seasonal expansions (e.g., The Lovers, The Moon, The Sun).

---

## 10. Testing Strategy

* **Unit Tests**: Card effects, fate meter, spread mechanics.
* **Integration Tests**: API endpoints, matchmaking flow, game resolution.
* **E2E Tests**: Full match simulation (PvP and PvE).
* **Load Tests**: Artillery or k6 for matchmaking + gameplay concurrency.

---

## 11. PvP & PvE Modes

* **PvP**: Real-time ladder play, similar to **Hearthstone**, **Legends of Runeterra** — short matches, deck variety.
* **PvE**: Roguelite “reading runs” inspired by **Legends of Kingdom Rush** (board progression) + Runeterra’s Labs (scenario-based encounters).
* PvE will have branching events, AI opponents with themed decks, and unique rewards.

---

## 12. Art & Asset Pipeline

* Purchased tarot card skins from itch.io.
* Plan: Commission full tarot decks (Major Arcana + Minors) from artists and give them 100% of earnings from those specific designs.
* All assets processed via automated pipeline to generate upright/reversed variants, alt-arts, and responsive formats for web/native.

---

## 13. Monorepo Structure, npm scripts, Docker, and CI/CD

**See detailed section in the appended infra section** — includes:

* Monorepo with npm workspaces.
* npm scripts for build/dev/test/export/deploy.
* Docker + docker-compose for local stack.
* GitHub Actions for CI/CD, Godot exports, and Vercel deploy.

---

## 14. Distribution

* Web client hosted at `/play` via Next.js static route.
* Native builds uploaded to GitHub Releases and linked on `/downloads`.
* Optional mobile build.

---

## 15. Local Workflow

* `npm install` → install deps.
* `npm run dev:web` → start web app; `npm run docs` for docs.
* Test via Jest/Vitest/Playwright.
* Export Godot builds for local/web test.

---

## 16. MVP Goal

* Fully playable PvP and PvE mode.
* 60+ base cards (minors + majors).
* Working fate/spread mechanics.
* Tests implemented for all critical systems.
* Artist assets integrated for first playable deck sets.

---

## 21. mvp-first build style (no roadmap, just vibecoding)

we’ll ship by cutting to a minimal, test-backed slice. no gantt charts.

**mvp cutlist**

* **pvp (ranked bo1)**: queue → mulligan (3-card spread) → turns → concede/victory; 80 cards max; 6 status effects; 6 starters; 6 majors.
* **pve (roguelite “reading” run v0)**: 3 floors + 1 boss; draft 1 omen per floor; 1 shop; 1 event; seed shown at start; unlock cosmetics.
* **economy v0**: shards → craft; season pass skeleton; alt-arts visible in collection.
* **cosmetics v0**: static alt-art + frame; basic board skin; major-arcana reveal anim.
* **deploy**: website on vercel, worker on compose/railway, godot web on `/play`, native builds on github releases.

**definition of done (mvp)**

* every card has **unit tests** for upright/reversed.
* the **server-sim** replays at least 100 seeded actions with deterministic equality.
* 1 full **pvp match** e2e (bot vs bot) in ci + 1 **pve run** e2e (seeded) in ci.
* zero client authority violations (all intents rejected locally still sync).

---

## 22. testing strategy (unit, integration, e2e)

**goals**: determinism, fast feedback, confidence to ship daily.

### 22.1 pyramid

* **unit (heavy)**: card effects, cost rules, target validators, status resolution, fate ops; pure ts in `packages/game-sim`.
* **integration (medium)**: deck load → match start, ws intents → state diffs, db writes (drizzle) and redis queues.
* **e2e (light)**: headless pvp (bot vs bot), headless pve (seeded run), http+ws smoke.

### 22.2 libraries & tools

* **vitest** + **tsx** for unit/integration (ts-first, watch mode).
* **zod** for message schemas + runtime validation.
* **playwright** for minimal site flows (login, deck edit, /play loads).
* **faker + fast-check** for property-based tests on effect dsl.
* **eslint** + **tsc --noEmit** in ci.

### 22.3 harnesses

* **golden-master**: serialize state after each action; compare to blessed snapshots per seed.
* **replay fuzzer**: generate random legal intents from a seed, ensure no panics and end state validity.
* **timeline debugger**: dump action log with diffs for any failing test; store as ci artifact.

### 22.4 ci gates

* `vitest --coverage` threshold gates (lines/branches >= 85%).
* match re-sim for last 50 public matches (nightly) to detect drift.
* migrations dry-run + rollback test.

---

## 23. assets, licensing, and artist revenue share

**source**: you already have tarot skins from itch.io. we’ll:

* track **license metadata** per asset (source url, author, license id, date, proof file).
* attribute authors in-game (`/credits`) and on the card tooltip.
* import pipeline: drop asset → atlas/resize → generate `card_skin.json` with links.

**artist program**

* propose: for any card **alt-art** sourced from an external artist, pay **100% of net earnings** of that cosmetic to the artist.
* implement **revenue tracking**:

  * `artist` table; `asset` table (sku, artist\_id); `sale` table (sku, price, fees, net, tx id).
  * monthly statement export (csv/pdf) + dashboard per artist (oauth).
* legal: short-form license granting you distribution; revenue-share addendum; auto-renew unless terminated.
* operations: payout via stripe connect (express); min payout threshold; vat/tax handling via stripe.

**content flags**

* `available_regions`, `age_rating`, `commercial_rights` boolean, `attribution_required` string.

---

## 24. pvp & pve design notes with examples

**pvp (fast, readable, 8–10 mins)**

* target feel: **hearthstone** bo1 cadence + **marvel snap** clarity (snappy turns, visible stakes) without snapping mechanic.
* ladder: seasonal mmr, soft decay; featured formats (standard, chaos week with altered fate gains).
* anti-rope: per-turn timer, bonus time bank, server ends turn if exceeded.

**pve (sticky, replayable)**

* inspirations: **legends of runeterra – path of champions** (hero growth & map nodes), **hearthstone – dungeon run/roguelike adventures**, **slay the spire**/**monster train** (map choices, relics), plus your ref **legends of kingdom rush** (node variety & quick encounters).
* structure v0: node map with shops/events/elites/boss; draft **omens** and **boons**; persistent **significator** progression (cosmetic only in pvp).
* encounter scripting: json-driven encounters with conditional weights; per-node seed for reproducibility.

**content cadence**

* weekly mini-events: +1 omen to picks; reversed-first weekend; tower-takedown brawl (everyone gets The Tower at start).

---

## 25. example tests (sketches)

**unit – card effect**

```ts
it('two of swords: upright silences for 1', () => {
  const s = seedMatch('a1b2');
  play(s, P1, draw('swords_02'), target(P2, 'unit:latest'));
  expect(state(s).targets[0].silenced).toBe(1);
});
```

**integration – ws intent → state diff**

```ts
it('server resolves play_card and broadcasts diff', async () => {
  const { server, c1, c2 } = await bootMatch();
  await c1.send({ type: 'play_card', id: 'wands_03', target: 'u2:front' });
  const diff = await c2.next('state_update');
  expect(diff.apply.ok).toBe(true);
});
```

**e2e – pve seeded run**

```ts
it('seed 9f9f clears boss in 9±1 turns', async () => {
  const res = await runPVERun({ seed: '9f9f', deck: STARTER_PENTACLES });
  expect(res.won).toBe(true);
  expect(res.turns).toBeLessThanOrEqual(10);
});
```

---

## 26. content ops (no-roadmap, ship daily)

* add cards via pr with json + unit tests; ci labels `needs-snap-update` if snapshots change.
* balance toggles via admin; "shadow-ship" cards behind `disabled: true` until event start.
* daily patch window (UTC 18:00) with automated changelog from commit messages.
* balance toggles via balance.json (hot-reload), instant disable, timed effects
* a/b + canary rollout with auto-rollback guards
* daily patch pipeline + snapshot workflow
* telemetry auto-flags for buff/nerf/rework candidates
* ids & print versioning (swords_02@v2), deprecations + migrations/refunds
* content qa checklist (tests, l10n, licensing, perf)
* pr template fields
* admin preview env, l10n pipeline
* godot asset updates + cache busting
* npm script shortcuts and a mini incident playbook


---

## 27. observability & ops

* **metrics** – opentelemetry + prometheus: match duration, card play rates, deck winrates, api latency
* **logs/traces** – structured json logs, distributed tracing across godot→next→db
* **dashboards** – grafana views: player funnel, economy health, server load, error rates
* **slo/alerts** – 99.5% api uptime, <500ms p95 match start, <2s card resolution
* **backups** – daily postgres dumps + point-in-time recovery, redis persistence config
* **kill switches** – feature flags for matchmaking, payments, new card releases
* **incident response** – runbooks for common scenarios (db down, ddos, payment failures)

---

## 28. moderation & community

* **chat/reporting** – in-game text filtering, player reporting ui, mod queue dashboard
* **anti-abuse** – rate limiting, captcha, device fingerprinting, behavior scoring
* **sanctions** – temp/perm bans, chat restrictions, matchmaking timeouts
* **support** – ticket system integration, account recovery flows, refund automation
* **community tools** – tournament brackets, leaderboards, seasonal rewards
* **content moderation** – deck name filtering, avatar upload guidelines

---

## 29. compliance & legal

* **privacy** – gdpr consent flows, data export/deletion, cookie policies
* **licenses/attribution** – asset licensing tracking, third-party notices, open source compliance
* **payments** – stripe integration, connect for artist payouts, tax reporting, chargeback handling
* **age gates** – coppa compliance, parental controls, spending limits
* **terms of service** – game rules, account suspension policies, ip ownership
* **regional compliance** – content rating submissions, gambling law review

---

## 30. open questions

* **ws hosting** – dedicated servers vs managed websocket services (pusher, ably)
* **mobile signing** – ios app store process, android keystore management
* **economy knobs** – pack pricing, daily reward curves, crafting costs, tournament entry fees
* **artist payout** – monthly vs quarterly, revenue share percentages, minimum thresholds
* **accessibility** – screen reader support, colorblind-friendly ui, keyboard navigation
* **internationalization** – translation workflows, region-specific content, currency support
