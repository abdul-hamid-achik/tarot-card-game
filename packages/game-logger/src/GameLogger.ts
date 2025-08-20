import {
  GameEvent,
  GameLogContext,
  LoggerConfig,
  CardPlayEvent,
  ActionEvent,
  PhaseEvent,
  HealthEvent,
  CombatEvent,
  ResourceEvent,
  GameStateEvent
} from './types.js';

export class GameLogger {
  private currentContext: GameLogContext = {};
  private eventBuffer: GameEvent[] = [];
  private config: Required<LoggerConfig>;
  private isNode: boolean;

  constructor(config: LoggerConfig = {}) {
    this.isNode = typeof window === 'undefined';
    
    this.config = {
      level: config.level || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' ? 'info' : 'debug'),
      enabled: config.enabled ?? true,
      maxBufferSize: config.maxBufferSize || 1000,
      formatters: {
        console: config.formatters?.console || this.defaultConsoleFormatter.bind(this),
        file: config.formatters?.file || this.defaultFileFormatter.bind(this)
      },
      transports: {
        console: config.transports?.console ?? true,
        file: config.transports?.file ?? this.isNode,
        custom: config.transports?.custom || []
      }
    };

    // Set environment in context
    this.currentContext.environment = this.isNode ? 'server' : 'browser';
  }

  // Context management
  setContext(context: Partial<GameLogContext>) {
    this.currentContext = { ...this.currentContext, ...context };
  }

  clearContext() {
    this.currentContext = { environment: this.isNode ? 'server' : 'browser' };
  }

  getContext(): GameLogContext {
    return { ...this.currentContext, timestamp: Date.now() };
  }

  // Enable/disable logging
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  // Core logging method
  private log(event: GameEvent) {
    if (!this.config.enabled) return;

    // Add current context to event
    const enrichedEvent = {
      ...event,
      ...this.getContext(),
      // Override with event-specific context if provided
      ...Object.fromEntries(
        Object.entries(event).filter(([key]) => 
          ['matchId', 'playerId', 'turn', 'phase', 'timestamp'].includes(key)
        )
      )
    };

    // Add to buffer
    this.eventBuffer.push(enrichedEvent);
    if (this.eventBuffer.length > this.config.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-Math.floor(this.config.maxBufferSize / 2));
    }

    // Send to transports
    this.sendToTransports(enrichedEvent);
  }

  private sendToTransports(event: GameEvent) {
    const level = this.getLogLevel(event.type);
    const shouldLog = this.shouldLog(level);

    if (!shouldLog) return;

    // Console transport
    if (this.config.transports.console) {
      const message = this.config.formatters.console!(event);
      this.logToConsole(level, message, event);
    }

    // File transport (Node.js only)
    if (this.config.transports.file && this.isNode) {
      this.logToFile(event);
    }

    // Custom transports
    this.config.transports.custom!.forEach(transport => {
      try {
        transport(event);
      } catch (error) {
        console.error('Custom transport error:', error);
      }
    });
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.level);
    const eventLevel = levels.indexOf(level);
    return eventLevel >= configLevel;
  }

  private getLogLevel(eventType: string): string {
    switch (eventType) {
      case 'HEALTH_CHANGE':
      case 'COMBAT':
      case 'CARD_PLAY':
      case 'PHASE_TRANSITION':
      case 'GAME_STATE':
        return 'info';
      case 'ACTION':
      case 'RESOURCE_CHANGE':
        return 'debug';
      default:
        return 'debug';
    }
  }

  private logToConsole(level: string, message: string, event: GameEvent) {
    const timestamp = new Date(event.timestamp || Date.now()).toISOString();
    const prefix = `🎮 [${timestamp}] [${level.toUpperCase()}]`;
    
    if (this.isNode) {
      // Node.js console with colors
      const colors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m'  // red
      };
      const reset = '\x1b[0m';
      const color = colors[level as keyof typeof colors] || '';
      console.log(`${color}${prefix} ${message}${reset}`);
    } else {
      // Browser console
      const styles = {
        debug: 'color: cyan',
        info: 'color: green',
        warn: 'color: orange',
        error: 'color: red'
      };
      const style = styles[level as keyof typeof styles] || '';
      console.log(`%c${prefix} ${message}`, style);
    }
  }

  private async logToFile(event: GameEvent) {
    if (!this.isNode) return;
    
    try {
      // Dynamic import to avoid bundling issues in browser
      const { writeFileSync, existsSync, mkdirSync, appendFileSync } = await eval('import("fs")');
      const { join } = await eval('import("path")');
      
      const logsDir = 'logs';
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
      }
      
      const logFile = join(logsDir, 'game-debug.log');
      const logLine = this.config.formatters.file!(event) + '\n';
      
      appendFileSync(logFile, logLine);
    } catch (error) {
      // Fail silently for file logging
    }
  }

  private defaultConsoleFormatter(event: GameEvent): string {
    const evt = event as any; // Type assertion for flexibility
    switch (evt.type) {
      case 'CARD_PLAY':
        return `🃏 ${evt.playerId} played ${evt.card.name} (${evt.card.cost} fate)${evt.targetSlot !== undefined ? ` to slot ${evt.targetSlot}` : ''}`;
      
      case 'PHASE_TRANSITION':
        return `⏱️ Phase: ${evt.fromPhase} → ${evt.toPhase} (${evt.trigger})`;
      
      case 'HEALTH_CHANGE':
        const changeStr = evt.damage ? `-${evt.damage}` : `+${evt.healing}`;
        return `❤️ ${evt.targetName} health: ${evt.healthBefore} → ${evt.healthAfter} (${changeStr}) - ${evt.cause}`;
      
      case 'COMBAT':
        if (evt.subType === 'UNIT_CLASH' && evt.attacker && evt.defender) {
          return `⚔️ Combat: ${evt.attacker.name} vs ${evt.defender.name} at position ${evt.attacker.position}`;
        }
        return `⚔️ Combat: ${evt.subType}`;
      
      case 'ACTION':
        return `🎯 Action: ${evt.action} ${evt.success ? '✅' : '❌'}${evt.reason ? ` (${evt.reason})` : ''}`;
      
      case 'RESOURCE_CHANGE':
        return `💎 ${evt.resource}: ${evt.before} → ${evt.after} (${evt.change > 0 ? '+' : ''}${evt.change}) - ${evt.reason}`;
      
      case 'GAME_STATE':
        return `🎮 Game: ${evt.subType}`;
      
      default:
        return `📝 ${evt.type}`;
    }
  }

  private defaultFileFormatter(event: GameEvent): string {
    return JSON.stringify(event);
  }

  // Specific logging methods
  logCardPlay(event: Omit<CardPlayEvent, 'type' | keyof GameLogContext>) {
    this.log({ type: 'CARD_PLAY', ...event });
  }

  logAction(action: string, details: Record<string, any> = {}, success: boolean = true, reason?: string) {
    this.log({
      type: 'ACTION',
      action,
      details,
      success,
      reason
    });
  }

  logPhaseTransition(fromPhase: string, toPhase: string, trigger: string) {
    this.log({
      type: 'PHASE_TRANSITION',
      fromPhase,
      toPhase,
      trigger
    });
  }

  logHealthChange(event: Omit<HealthEvent, 'type' | keyof GameLogContext>) {
    this.log({ type: 'HEALTH_CHANGE', ...event });
  }

  logCombat(event: Omit<CombatEvent, 'type' | keyof GameLogContext>) {
    this.log({ type: 'COMBAT', ...event });
  }

  logResourceChange(event: Omit<ResourceEvent, 'type' | keyof GameLogContext>) {
    this.log({ type: 'RESOURCE_CHANGE', ...event });
  }

  logGameState(subType: GameStateEvent['subType'], details: Record<string, any> = {}) {
    this.log({
      type: 'GAME_STATE',
      subType,
      details
    });
  }

  // Utility methods
  getEventBuffer(): GameEvent[] {
    return [...this.eventBuffer];
  }

  getEventsByType(type: GameEvent['type']): GameEvent[] {
    return this.eventBuffer.filter(event => event.type === type);
  }

  getEventsForMatch(matchId: string): GameEvent[] {
    return this.eventBuffer.filter(event => event.matchId === matchId);
  }

  getEventsForPlayer(playerId: string): GameEvent[] {
    return this.eventBuffer.filter(event => event.playerId === playerId);
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.eventBuffer, null, 2);
  }

  // Clear event buffer
  clearBuffer() {
    this.eventBuffer = [];
  }

  // Helper methods for common game scenarios
  logMatchStart(matchState: any) {
    this.setContext({
      matchId: matchState.matchId,
      turn: matchState.turn,
      phase: matchState.phase
    });

    this.logGameState('MATCH_START', {
      type: matchState.type,
      players: Object.keys(matchState.players),
      activePlayer: matchState.activePlayer
    });
  }

  logTurnStart(playerId: string, turn: number, phase: string) {
    this.setContext({ playerId, turn, phase });
    this.logGameState('TURN_START', { playerId, turn });
  }

  logPlayerPass(playerId: string, consecutivePass: boolean = false) {
    this.logGameState('PLAYER_PASS', { 
      playerId, 
      consecutivePass,
      canEndRound: consecutivePass 
    });
  }

  // Combat logging helpers
  logCombatStart() {
    this.logCombat({ subType: 'START' });
  }

  logCombatEnd(summary: { playerDamage: number; opponentDamage: number; unitsDestroyed: number }) {
    this.logCombat({ subType: 'END', result: JSON.stringify(summary) });
  }

  logUnitDeath(unit: any, position: number, cause: string) {
    this.logCombat({
      subType: 'UNIT_DEATH',
      defender: {
        id: unit.id,
        name: unit.name,
        attack: unit.attack || 0,
        health: unit.health || 0,
        position
      },
      result: cause
    });
  }
}