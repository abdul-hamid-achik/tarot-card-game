# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Install dependencies (use --ignore-scripts flag)
npm install --ignore-scripts

# Development
npm run dev          # Start Next.js web app with local Neon DB (port 3000)
npm run docs         # Start documentation site

# Build
npm run build        # Build all packages in correct order

# Testing
npm run test         # Run game-sim tests
npm run test:watch   # Run game-sim tests in watch mode
npm run e2e:web      # Run Playwright E2E tests (requires dev server running)

# Database
npm run compose:up   # Start local Neon PostgreSQL via Docker
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed database with initial data

# Code Quality
npm run lint         # ESLint with TypeScript (max-warnings=0)
npm run format       # Prettier formatting
```

### Workspace-specific Commands
```bash
# Web app (@tarot/web)
npm run -w @tarot/web dev       # Start web dev server
npm run -w @tarot/web build     # Build web app

# Game simulator (@tarot/game-sim)
npm run -w @tarot/game-sim test        # Run simulator tests
npm run -w @tarot/game-sim test:watch  # Watch mode
```

## Architecture Overview

### Monorepo Structure
This is a Turborepo monorepo with TypeScript workspaces:

- **apps/web**: Next.js 15 app with App Router
  - Authentication via NextAuth.js with Drizzle adapter
  - Game UI with React components and Zustand state management
  - API routes for matchmaking, cards, decks, and game state
  - Real-time updates via Server-Sent Events (SSE)

- **packages/game-sim**: Core game simulator
  - Deterministic server-authoritative game logic
  - TypeScript with comprehensive Vitest test suite
  - Handles game state, card effects, combat resolution
  - Bot AI for testing and PvE gameplay

- **packages/db**: Database layer
  - Drizzle ORM with PostgreSQL (local Neon via Docker)
  - Schema definitions for auth, cards, decks, matches
  - Type-safe database operations

- **apps/docs**: Documentation site (Nextra)

### Key Technical Decisions

1. **Database**: PostgreSQL via Neon (Docker locally) with Drizzle ORM
   - Auth tables integrated with NextAuth.js
   - Game data (cards, decks) stored in PostgreSQL
   - In-memory fallback for development

2. **Game State**: Server-authoritative simulation
   - Deterministic RNG for reproducible gameplay
   - Intent-based system for player actions
   - Complete game state serialization

3. **Real-time Communication**: Server-Sent Events (SSE)
   - Match streaming for live updates
   - Queue polling for matchmaking
   - No WebSocket dependency

4. **Authentication**: NextAuth.js v5 beta
   - Database sessions via Drizzle adapter
   - Credentials provider for development
   - Session management in API routes

### Game Concepts

- **Tarot-themed TCG**: Digital trading card game with Tarot aesthetic
- **Three Victory Conditions**: Trials (objectives), Defeat (damage), Turn 10+ sudden death
- **Fate System**: Resource for card manipulation and special actions
- **Orientation Mechanics**: Cards can be upright or reversed with different effects
- **Spread Bonuses**: Starting hand positions grant different benefits

### API Endpoints

Core endpoints in `apps/web/app/api/`:
- `/api/cards` - Card database
- `/api/decks` - Deck management
- `/api/match/queue` - Matchmaking queue
- `/api/match/start` - Start matches
- `/api/match/result` - Poll match results
- `/api/match/stream` - SSE for live matches
- `/api/auth/*` - NextAuth.js routes

### Testing Strategy

- **Unit Tests**: Vitest in game-sim package
- **Property Tests**: Fast-check for invariants
- **Golden Tests**: Snapshot testing for game timeline
- **E2E Tests**: Playwright for web app flows
- **Bot vs Bot**: Automated gameplay testing

## Important Files

- `packages/db/src/schema.ts` - Database schema definitions
- `packages/game-sim/src/sim.ts` - Core game simulation logic
- `apps/web/auth.ts` - NextAuth.js configuration
- `apps/web/components/game/GameBoard.tsx` - Main game UI component
- `apps/web/lib/matchStore.ts` - Client-side match state management