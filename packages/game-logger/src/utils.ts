import { GameLogger } from './GameLogger.js';
import { GameEvent } from './types.js';

// Convenience functions for common patterns
export const withGameLogging = {
  cardPlay: (logger: GameLogger, card: any, playerId: string, targetSlot?: number, fateBefore: number = 0, fateAfter: number = 0) => {
    logger.logCardPlay({
      card: {
        id: card.id,
        name: card.name,
        suit: card.suit,
        cost: card.cost,
        type: card.type
      },
      targetSlot,
      playerResources: {
        fateBefore,
        fateAfter
      }
    });
  },

  healthChange: (logger: GameLogger, target: 'player' | 'unit', targetId: string, targetName: string, 
                 healthBefore: number, healthAfter: number, source: string, cause: string) => {
    const change = healthAfter - healthBefore;
    logger.logHealthChange({
      target,
      targetId,
      targetName,
      healthBefore,
      healthAfter,
      damage: change < 0 ? Math.abs(change) : undefined,
      healing: change > 0 ? change : undefined,
      source,
      cause
    });
  },

  phaseChange: (logger: GameLogger, from: string, to: string, trigger: string) => {
    logger.logPhaseTransition(from, to, trigger);
  }
};

// Event analysis utilities
export const analyzeGameSession = (events: GameEvent[]) => {
  const analysis = {
    totalEvents: events.length,
    cardPlays: events.filter(e => e.type === 'CARD_PLAY').length,
    phaseTransitions: events.filter(e => e.type === 'PHASE_TRANSITION').length,
    combatEvents: events.filter(e => e.type === 'COMBAT').length,
    healthChanges: events.filter(e => e.type === 'HEALTH_CHANGE').length,
    actions: events.filter(e => e.type === 'ACTION').length,
    resourceChanges: events.filter(e => e.type === 'RESOURCE_CHANGE').length,
    gameStates: events.filter(e => e.type === 'GAME_STATE').length,
    duration: 0,
    avgEventsPerTurn: 0,
    errorRate: 0
  };

  if (events.length > 0) {
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    if (firstEvent.timestamp && lastEvent.timestamp) {
      analysis.duration = lastEvent.timestamp - firstEvent.timestamp;
    }

    // Calculate error rate from actions
    const actionEvents = events.filter(e => e.type === 'ACTION') as any[];
    const failedActions = actionEvents.filter(e => !e.success).length;
    analysis.errorRate = actionEvents.length > 0 ? (failedActions / actionEvents.length) * 100 : 0;

    // Calculate average events per turn
    const turnEvents = events.filter(e => e.type === 'GAME_STATE' && e.subType === 'TURN_START');
    analysis.avgEventsPerTurn = turnEvents.length > 0 ? events.length / turnEvents.length : 0;
  }

  return analysis;
};

// Performance monitoring
export const createPerformanceLogger = (logger: GameLogger) => {
  const performanceMarks = new Map<string, number>();

  return {
    mark: (name: string) => {
      performanceMarks.set(name, Date.now());
      logger.logAction(`perf_mark_${name}`, { timestamp: Date.now() });
    },

    measure: (name: string, startMark: string, endMark?: string) => {
      const startTime = performanceMarks.get(startMark);
      const endTime = endMark ? performanceMarks.get(endMark) : Date.now();
      
      if (startTime && endTime) {
        const duration = endTime - startTime;
        logger.logAction(`perf_measure_${name}`, {
          startMark,
          endMark: endMark || 'now',
          duration,
          startTime,
          endTime
        });
        return duration;
      }
      return 0;
    },

    clear: () => {
      performanceMarks.clear();
      logger.logAction('perf_clear', {});
    }
  };
};

// Debugging utilities
export const createDebugSession = (logger: GameLogger, sessionId: string) => {
  logger.setContext({ matchId: sessionId }); // Use matchId instead of sessionId
  
  return {
    start: () => {
      logger.logAction('debug_session_start', { sessionId });
    },
    
    end: () => {
      const events = logger.getEventBuffer();
      const analysis = analyzeGameSession(events);
      logger.logAction('debug_session_end', { sessionId, analysis });
      return analysis;
    },
    
    checkpoint: (name: string, data: any = {}) => {
      logger.logAction('debug_checkpoint', { name, data, sessionId });
    },
    
    export: () => {
      return {
        sessionId,
        events: logger.getEventBuffer(),
        analysis: analyzeGameSession(logger.getEventBuffer()),
        timestamp: Date.now()
      };
    }
  };
};