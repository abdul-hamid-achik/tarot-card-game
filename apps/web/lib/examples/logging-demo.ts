/**
 * Example demonstrating the game logging system
 * Run this in the browser console or Node.js to see the logging in action
 */

import { gameLogger, withGameLogging, analyzeGameSession } from '@tarot/game-logger';

export function runLoggingDemo() {
  console.log('🎮 Starting Game Logging Demo...\n');

  // Clear previous logs
  gameLogger.clearBuffer();

  // Set initial context
  gameLogger.setContext({
    matchId: 'demo-match-001',
    playerId: 'demo-player',
    turn: 1,
    phase: 'main'
  });

  // Log match start
  gameLogger.logMatchStart({
    matchId: 'demo-match-001',
    type: 'demo',
    turn: 1,
    phase: 'main',
    players: { 'demo-player': {}, 'demo-opponent': {} },
    activePlayer: 'demo-player'
  });

  // Log some card plays
  const cards = [
    { id: 'card-1', name: 'The Fool', suit: 'major', cost: 0, type: 'major' as const },
    { id: 'card-2', name: 'Ace of Wands', suit: 'wands', cost: 1, type: 'unit' as const },
    { id: 'card-3', name: 'Fireball', suit: 'wands', cost: 2, type: 'spell' as const }
  ];

  cards.forEach((card, index) => {
    setTimeout(() => {
      withGameLogging.cardPlay(gameLogger, card, 'demo-player', index, 3, 3 - card.cost);
      
      if (card.type === 'unit') {
        gameLogger.logAction('unit_summoned', {
          cardName: card.name,
          position: index,
          attack: 2,
          health: 3
        }, true);
      }
    }, index * 100);
  });

  // Log phase transition
  setTimeout(() => {
    withGameLogging.phaseChange(gameLogger, 'main', 'combat', 'Player ended turn');
  }, 400);

  // Log combat events
  setTimeout(() => {
    gameLogger.logCombatStart();
    
    gameLogger.logCombat({
      subType: 'UNIT_CLASH',
      attacker: {
        id: 'card-2',
        name: 'Ace of Wands',
        attack: 3,
        health: 3,
        position: 1
      },
      defender: {
        id: 'enemy-1',
        name: 'Shadow Minion',
        attack: 2,
        health: 2,
        position: 1
      },
      damage: 3
    });

    withGameLogging.healthChange(gameLogger, 'unit', 'enemy-1', 'Shadow Minion', 2, 0, 'Ace of Wands', 'Combat damage');
    
    gameLogger.logUnitDeath(
      { id: 'enemy-1', name: 'Shadow Minion', attack: 2, health: 0 },
      1,
      'Destroyed by Ace of Wands'
    );
  }, 500);

  // Log direct damage
  setTimeout(() => {
    gameLogger.logCombat({
      subType: 'DIRECT_DAMAGE',
      attacker: {
        id: 'card-2',
        name: 'Ace of Wands',
        attack: 3,
        health: 3,
        position: 1
      },
      damage: 3
    });

    withGameLogging.healthChange(gameLogger, 'player', 'demo-opponent', 'Opponent', 20, 17, 'Ace of Wands', 'Direct combat damage');
  }, 600);

  // Log some failed actions
  setTimeout(() => {
    gameLogger.logAction('play_card', {
      cardName: 'Lightning Bolt',
      cost: 5,
      availableMana: 2
    }, false, 'Insufficient mana');

    gameLogger.logAction('place_unit', {
      cardName: 'Giant Spider',
      targetSlot: 2
    }, false, 'Slot occupied');
  }, 700);

  // Log resource changes
  setTimeout(() => {
    gameLogger.logResourceChange({
      resource: 'fate',
      before: 1,
      after: 4,
      change: 3,
      reason: 'Turn start refill'
    });

    gameLogger.logResourceChange({
      resource: 'maxFate',
      before: 3,
      after: 4,
      change: 1,
      reason: 'Turn progression'
    });
  }, 800);

  // Log turn end and analysis
  setTimeout(() => {
    gameLogger.logPlayerPass('demo-player', true);
    withGameLogging.phaseChange(gameLogger, 'combat', 'main', 'Combat resolved');
    gameLogger.logTurnStart('demo-opponent', 2, 'main');

    // Analyze the session
    const events = gameLogger.getEventBuffer();
    const analysis = analyzeGameSession(events);

    console.log('\n📊 Game Session Analysis:');
    console.log('========================');
    console.log(`Total Events: ${analysis.totalEvents}`);
    console.log(`Card Plays: ${analysis.cardPlays}`);
    console.log(`Combat Events: ${analysis.combatEvents}`);
    console.log(`Health Changes: ${analysis.healthChanges}`);
    console.log(`Actions: ${analysis.actions}`);
    console.log(`Error Rate: ${analysis.errorRate.toFixed(1)}%`);
    console.log(`Avg Events/Turn: ${analysis.avgEventsPerTurn.toFixed(1)}`);
    
    // Show some specific event types
    console.log('\n🃏 Card Play Events:');
    gameLogger.getEventsByType('CARD_PLAY').forEach(event => {
      const evt = event as any;
      console.log(`  - ${evt.card.name} (${evt.card.cost} cost) to slot ${evt.targetSlot}`);
    });

    console.log('\n⚔️ Combat Events:');
    gameLogger.getEventsByType('COMBAT').forEach(event => {
      const evt = event as any;
      console.log(`  - ${evt.subType}: ${evt.attacker?.name || 'Unknown'}`);
    });

    console.log('\n❌ Failed Actions:');
    gameLogger.getEventsByType('ACTION').forEach(event => {
      const evt = event as any;
      if (!evt.success) {
        console.log(`  - ${evt.action}: ${evt.reason}`);
      }
    });

    console.log('\n✅ Demo completed! Check the browser/server logs for detailed output.');
    console.log('💾 You can export logs with: gameLogger.exportLogs()');
  }, 1000);
}

// Example of creating a custom transport
export function setupAnalyticsTransport() {
  const customLogger = new (await import('@tarot/game-logger')).GameLogger({
    transports: {
      console: true,
      custom: [
        (event) => {
          // Example: Send critical events to analytics
          if (event.type === 'HEALTH_CHANGE' || event.type === 'CARD_PLAY') {
            console.log('📈 Analytics Event:', event.type, event);
          }
        },
        (event) => {
          // Example: Send errors to error tracking
          if (event.type === 'ACTION' && !(event as any).success) {
            console.error('🚨 Error Tracking:', event);
          }
        }
      ]
    }
  });

  return customLogger;
}

// Browser-only: Add to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).runLoggingDemo = runLoggingDemo;
  (window as any).gameLogger = gameLogger;
  console.log('🎮 Logging demo available! Run: runLoggingDemo()');
}