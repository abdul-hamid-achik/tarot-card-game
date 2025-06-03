import { createSeededRandom } from './rng.js';
import type { MatchState } from './types.js';
import { IntentSchema, type IntentInput, MatchStateSchema } from './schemas.js';

export interface SimulationResult {
  state: MatchState;
}

export function createInitialState(params: {
  matchId: string;
  seed: string;
  players: string[];
}): MatchState {
  const base: MatchState = {
    matchId: params.matchId,
    seed: params.seed,
    players: params.players,
    turn: 0,
    fate: Object.fromEntries(params.players.map((p) => [p, 0])),
    stacks: {},
    battlefield: {},
    hands: {},
  };
  return MatchStateSchema.parse(base);
}

export function applyIntent(state: MatchState, intent: IntentInput): MatchState {
  const parsed = IntentSchema.parse(intent);
  switch (parsed.type) {
    case 'end_turn': {
      return { ...state, turn: state.turn + 1 };
    }
    case 'play_card': {
      // Only allow play if card is in hand
      const hands = (state.hands as Record<string, { hand: string[] }>) || {};
      const hand = (hands[parsed.playerId]?.hand ?? []);
      if (!hand.includes(parsed.cardId)) {
        return state; // reject silently for now
      }
      const nextHand = hand.filter((c) => c !== parsed.cardId);
      const nextHands = { ...hands, [parsed.playerId]: { hand: nextHand } } as Record<string, { hand: string[] }>;
      const bf = (state.battlefield as Record<string, { played: string[] }>) || {};
      const byPlayer = bf[parsed.playerId] ?? { played: [] };
      const nextByPlayer = { played: [...byPlayer.played, parsed.cardId] };
      const nextBattlefield = { ...bf, [parsed.playerId]: nextByPlayer } as Record<string, { played: string[] }>;
      void createSeededRandom(state.seed);
      return { ...state, hands: nextHands, battlefield: nextBattlefield };
    }
    case 'draw': {
      const hands = (state.hands as Record<string, { hand: string[] }>) || {};
      const hand = (hands[parsed.playerId]?.hand ?? []);
      const nextHands = { ...hands, [parsed.playerId]: { hand: [...hand, parsed.cardId] } } as Record<string, { hand: string[] }>;
      return { ...state, hands: nextHands };
    }
    default: {
      return state;
    }
  }
}

export function replay(state: MatchState, intents: IntentInput[]): SimulationResult {
  let current = state;
  for (const intent of intents) {
    current = applyIntent(current, intent);
  }
  return { state: current };
}

export interface ReplayStepLog {
  idx: number;
  intent: IntentInput;
  turn: number;
}

export function replayWithLog(state: MatchState, intents: IntentInput[]): { result: SimulationResult; steps: ReplayStepLog[] } {
  const steps: ReplayStepLog[] = [];
  let current = state;
  intents.forEach((intent, idx) => {
    current = applyIntent(current, intent);
    steps.push({ idx, intent, turn: current.turn });
  });
  return { result: { state: current }, steps };
}

export function generateIntents(seed: string, count: number, players: string[]): IntentInput[] {
  const r = createSeededRandom(seed);
  const intents: IntentInput[] = [];
  for (let i = 0; i < count; i += 1) {
    const playerId = players[r.nextInt(players.length)];
    const choose = r.next();
    if (choose < 0.35) {
      intents.push({ type: 'end_turn', playerId });
    } else {
      const cardId = `auto_${i}_${r.nextInt(1000)}`;
      intents.push({ type: 'play_card', playerId, cardId });
    }
  }
  return intents;
}
