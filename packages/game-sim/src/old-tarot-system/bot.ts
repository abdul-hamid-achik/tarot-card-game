import type { IntentInput } from './schemas.js';
import type { MatchState } from './types.js';
import { createSeededRandom } from './rng.js';

function getPlayerResources(state: MatchState, playerId: string): number {
  return (state.resources ?? {})[playerId] ?? 0;
}

function getPlayerHand(state: MatchState, playerId: string): string[] {
  const hands = state.hands as Record<string, { hand?: string[] }>;
  return hands?.[playerId]?.hand ?? [];
}

export function chooseBotIntent(state: MatchState, playerId: string, seed: string): IntentInput {
  const rng = createSeededRandom(`${seed}:bot:${state.turn}:${playerId}`);
  const hand = getPlayerHand(state, playerId);
  const resources = getPlayerResources(state, playerId);

  if (hand.length > 0 && resources > 0) {
    // Play the last card deterministically
    const cardId = hand[hand.length - 1];
    return { type: 'play_card', playerId, cardId };
  }

  // 50% draw, 50% end turn
  if (rng.next() < 0.5) {
    const cardId = `bot_${playerId}_${state.turn}_${rng.nextInt(1000)}`;
    return { type: 'draw', playerId, cardId };
  }

  return { type: 'end_turn', playerId };
}

export interface HeadlessMatchResult {
  state: MatchState;
  winnerId: string | null;
  steps: number;
}

export async function runHeadlessMatch(seed: string, players: string[], threshold = 3, maxSteps = 500): Promise<HeadlessMatchResult> {
  let state: MatchState = {
    matchId: `m_${seed}`,
    seed,
    players,
    turn: 0,
    fate: Object.fromEntries(players.map((p) => [p, 0])),
    resources: Object.fromEntries(players.map((p) => [p, 0])),
    stacks: {},
    battlefield: {},
    hands: {},
  };
  // Use dynamic import to avoid cycles in ESM
  const { applyIntent, checkVictory } = await import('./sim.js');

  let steps = 0;
  while (steps < maxSteps) {
    const currentPlayerIdx = state.turn % state.players.length;
    const currentPlayer = state.players[currentPlayerIdx];
    const intent = chooseBotIntent(state, currentPlayer, seed);
    state = applyIntent(state, intent);
    const winner = checkVictory(state, threshold);
    if (winner) return { state, winnerId: winner, steps: steps + 1 };
    steps += 1;
  }
  return { state, winnerId: null, steps };
}
