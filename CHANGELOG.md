# Changelog

All notable changes to this project will be documented in this file.

## [0.0.0] - Initial scaffolding
- Initialize monorepo with npm workspaces
- Add `packages/game-sim` (TypeScript + Vitest)
- Implement deterministic RNG utility
- Add first passing unit test
- Add CI workflow and `Taskfile.yml`

## [0.0.1] - Linting and schemas
- Add ESLint + Prettier baseline and CI lint step
- Add core types JSDoc
- Add `zod` schemas for card/deck/match and intents + tests

## [0.0.2] - Simulator baseline and determinism
- Add minimal simulator (init/apply/replay) with battlefield tracking of played cards
- Add timeline logging and stable serialization helper
- Add golden-style test, property test, and determinism tests
- Implement seeded intent generator and 100-action deterministic replay test
