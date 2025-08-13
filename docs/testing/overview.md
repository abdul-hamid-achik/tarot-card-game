# Testing Strategy

- Unit: card effects, cost rules, validators, status resolution, fate ops
- Integration: deck load → match start, ws intents → state diffs, db/redis
- E2E: pvp bot vs bot, pve seeded run
- Gates: coverage >= 85%; nightly re-sim; migrations dry-run

See `PLAN.md` §22.

Status: draft
