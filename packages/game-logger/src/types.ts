export interface GameLogContext {
  matchId?: string;
  playerId?: string;
  turn?: number;
  phase?: string;
  timestamp?: number;
  environment?: 'browser' | 'server';
}

export interface BaseGameEvent extends GameLogContext {
  type: string;
  id?: string;
}

export interface CardPlayEvent extends BaseGameEvent {
  type: 'CARD_PLAY';
  card: {
    id: string;
    name: string;
    suit: string;
    cost: number;
    type: 'unit' | 'spell' | 'major';
  };
  targetSlot?: number;
  playerResources: {
    fateBefore: number;
    fateAfter: number;
    spellManaBefore?: number;
    spellManaAfter?: number;
  };
}

export interface ActionEvent extends BaseGameEvent {
  type: 'ACTION';
  action: string;
  details: Record<string, any>;
  success: boolean;
  reason?: string;
}

export interface PhaseEvent extends BaseGameEvent {
  type: 'PHASE_TRANSITION';
  fromPhase: string;
  toPhase: string;
  trigger: string;
}

export interface HealthEvent extends BaseGameEvent {
  type: 'HEALTH_CHANGE';
  target: 'player' | 'unit';
  targetId: string;
  targetName: string;
  healthBefore: number;
  healthAfter: number;
  damage?: number;
  healing?: number;
  source: string;
  cause: string;
}

export interface CombatEvent extends BaseGameEvent {
  type: 'COMBAT';
  subType: 'START' | 'UNIT_CLASH' | 'DIRECT_DAMAGE' | 'UNIT_DEATH' | 'END';
  attacker?: {
    id: string;
    name: string;
    attack: number;
    health: number;
    position: number;
  };
  defender?: {
    id: string;
    name: string;
    attack: number;
    health: number;
    position: number;
  };
  damage?: number;
  result?: string;
}

export interface ResourceEvent extends BaseGameEvent {
  type: 'RESOURCE_CHANGE';
  resource: 'fate' | 'spellMana' | 'maxFate';
  before: number;
  after: number;
  change: number;
  reason: string;
}

export interface GameStateEvent extends BaseGameEvent {
  type: 'GAME_STATE';
  subType: 'MATCH_START' | 'MATCH_END' | 'TURN_START' | 'TURN_END' | 'PLAYER_PASS' | 'REACTION_WINDOW';
  details: Record<string, any>;
}

export type GameEvent = 
  | CardPlayEvent 
  | ActionEvent 
  | PhaseEvent 
  | HealthEvent 
  | CombatEvent 
  | ResourceEvent 
  | GameStateEvent;

export interface LoggerConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  enabled?: boolean;
  maxBufferSize?: number;
  formatters?: {
    console?: (event: GameEvent) => string;
    file?: (event: GameEvent) => string;
  };
  transports?: {
    console?: boolean;
    file?: boolean;
    custom?: Array<(event: GameEvent) => void>;
  };
}