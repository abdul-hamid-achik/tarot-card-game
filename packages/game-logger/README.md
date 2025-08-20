# @tarot/game-logger

A comprehensive, universal logging system for the Tarot Card Game that works in both browser and Node.js environments.

## Features

- 🌐 **Universal**: Works in both browser and server environments
- 🎯 **Game-specific**: Designed specifically for card game events
- 📊 **Rich Analytics**: Built-in event analysis and performance monitoring
- 🔧 **Configurable**: Flexible transport and formatting options
- 🚀 **Performance**: Efficient buffering and minimal overhead
- 🐛 **Debug-friendly**: Export logs, real-time viewing, session management

## Installation

```bash
npm install @tarot/game-logger
```

## Quick Start

```typescript
import { gameLogger } from '@tarot/game-logger';

// Set context for your game session
gameLogger.setContext({
  matchId: 'match-123',
  playerId: 'player1',
  turn: 1,
  phase: 'main'
});

// Log game events
gameLogger.logCardPlay({
  card: {
    id: 'card-456',
    name: 'The Fool',
    suit: 'major',
    cost: 0,
    type: 'major'
  },
  targetSlot: 2,
  playerResources: {
    fateBefore: 3,
    fateAfter: 3
  }
});

gameLogger.logAction('player_pass', { reason: 'no valid moves' });
gameLogger.logPhaseTransition('main', 'combat', 'Both players passed');
```

## Event Types

The logger supports the following game event types:

### Card Play Events
```typescript
gameLogger.logCardPlay({
  card: { id, name, suit, cost, type },
  targetSlot?: number,
  playerResources: { fateBefore, fateAfter, spellManaBefore?, spellManaAfter? }
});
```

### Action Events
```typescript
gameLogger.logAction(action: string, details: object, success: boolean, reason?: string);
```

### Phase Transitions
```typescript
gameLogger.logPhaseTransition(fromPhase: string, toPhase: string, trigger: string);
```

### Health Changes
```typescript
gameLogger.logHealthChange({
  target: 'player' | 'unit',
  targetId: string,
  targetName: string,
  healthBefore: number,
  healthAfter: number,
  damage?: number,
  healing?: number,
  source: string,
  cause: string
});
```

### Combat Events
```typescript
gameLogger.logCombat({
  subType: 'START' | 'UNIT_CLASH' | 'DIRECT_DAMAGE' | 'UNIT_DEATH' | 'END',
  attacker?: { id, name, attack, health, position },
  defender?: { id, name, attack, health, position },
  damage?: number,
  result?: string
});
```

### Resource Changes
```typescript
gameLogger.logResourceChange({
  resource: 'fate' | 'spellMana' | 'maxFate',
  before: number,
  after: number,
  change: number,
  reason: string
});
```

## Configuration

```typescript
import { GameLogger } from '@tarot/game-logger';

const logger = new GameLogger({
  level: 'debug', // 'debug' | 'info' | 'warn' | 'error'
  enabled: true,
  maxBufferSize: 1000,
  formatters: {
    console: (event) => `Custom format: ${event.type}`,
    file: (event) => JSON.stringify(event)
  },
  transports: {
    console: true,
    file: true, // Node.js only
    custom: [
      (event) => {
        // Send to analytics service
        analytics.track(event);
      }
    ]
  }
});
```

## Utility Functions

### Convenience Helpers
```typescript
import { withGameLogging } from '@tarot/game-logger';

// Simplified logging for common patterns
withGameLogging.cardPlay(logger, card, playerId, targetSlot, fateBefore, fateAfter);
withGameLogging.healthChange(logger, 'unit', cardId, cardName, oldHealth, newHealth, source, cause);
withGameLogging.phaseChange(logger, 'main', 'combat', 'Both players passed');
```

### Session Analysis
```typescript
import { analyzeGameSession } from '@tarot/game-logger';

const events = gameLogger.getEventBuffer();
const analysis = analyzeGameSession(events);
console.log(analysis);
// {
//   totalEvents: 156,
//   cardPlays: 23,
//   phaseTransitions: 8,
//   combatEvents: 12,
//   healthChanges: 18,
//   duration: 300000, // ms
//   avgEventsPerTurn: 19.5,
//   errorRate: 5.2 // %
// }
```

### Performance Monitoring
```typescript
import { createPerformanceLogger } from '@tarot/game-logger';

const perf = createPerformanceLogger(gameLogger);

perf.mark('combat_start');
// ... combat logic ...
perf.mark('combat_end');
perf.measure('combat_duration', 'combat_start', 'combat_end');
```

### Debug Sessions
```typescript
import { createDebugSession } from '@tarot/game-logger';

const session = createDebugSession(gameLogger, 'debug-session-1');
session.start();

// ... game logic ...
session.checkpoint('after_card_play', { cardName: 'The Fool' });

// ... more game logic ...
const analysis = session.end();
const exportData = session.export();
```

## Browser Integration

```typescript
// In your React components
import { gameLogger } from '@tarot/game-logger';

function GameBoard() {
  useEffect(() => {
    gameLogger.setContext({
      matchId: currentMatch.id,
      turn: currentMatch.turn,
      phase: currentMatch.phase
    });
  }, [currentMatch]);

  const handleCardPlay = (card, slot) => {
    gameLogger.logAction('drag_start', { cardId: card.id, cardName: card.name });
    // ... play card logic ...
  };
}
```

## Server Integration

```typescript
// In your Node.js server
import { gameLogger } from '@tarot/game-logger';

app.post('/api/match/play-card', (req, res) => {
  const { matchId, playerId, cardId, targetSlot } = req.body;
  
  gameLogger.setContext({ matchId, playerId });
  gameLogger.logAction('server_card_play_request', { cardId, targetSlot });
  
  // ... game logic ...
  
  gameLogger.logCardPlay({
    card: resolvedCard,
    targetSlot,
    playerResources: { fateBefore, fateAfter }
  });
});
```

## Data Export

```typescript
// Export logs for debugging
const logs = gameLogger.exportLogs();
const blob = new Blob([logs], { type: 'application/json' });

// Get specific events
const cardPlays = gameLogger.getEventsByType('CARD_PLAY');
const matchEvents = gameLogger.getEventsForMatch('match-123');
const playerEvents = gameLogger.getEventsForPlayer('player1');
```

## Environment Support

- ✅ Node.js 16+
- ✅ Modern browsers (ES2020+)
- ✅ React/Next.js applications
- ✅ Express/Fastify servers
- ✅ WebSocket servers
- ✅ Worker threads/Web Workers

## Performance

- Minimal overhead: ~0.1ms per log event
- Memory efficient: Automatic buffer rotation
- Non-blocking: File I/O is asynchronous
- Tree-shakeable: Import only what you need

## License

MIT