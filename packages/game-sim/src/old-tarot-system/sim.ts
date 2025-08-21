import { createSeededRandom } from './rng.js';
import type { MatchState } from './types.js';
import { ExtendedIntentSchema, type IntentInput, MatchStateSchema } from './schemas.js';
import { executeEffectsForPlayer, parseEffects } from './effects.js';

export interface SimulationResult {
  state: MatchState;
  winnerId?: string | null;
  turns?: number;
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
    resources: Object.fromEntries(params.players.map((p) => [p, 0])),
    stacks: {},
    battlefield: {},
    hands: {},
    phase: 'draw',
    reactionWindow: { open: false, responded: Object.fromEntries(params.players.map((p) => [p, false])) },
    triggerQueue: [],
    decks: Object.fromEntries(params.players.map((p) => [p, { draw: [], discard: [] }])),
  };
  return MatchStateSchema.parse(base);
}

function resetReactionWindow(state: MatchState): MatchState {
  const responded = Object.fromEntries(state.players.map((p) => [p, false]));
  return { ...state, reactionWindow: { open: false, responded } };
}

function openReactionWindow(state: MatchState, originPlayerId?: string): MatchState {
  const responded = Object.fromEntries(state.players.map((p) => [p, false]));
  return { ...state, reactionWindow: { open: true, responded, originPlayerId } };
}

function advancePhase(state: MatchState): MatchState {
  const currentPhase = state.phase ?? 'end';
  const processTriggers = (s: MatchState): MatchState => {
    const queue = [...(s.triggerQueue ?? [])];
    const toProcess = queue.splice(0, Math.min(3, queue.length));
    if (toProcess.length === 0) return s;
    const stacks = { ...(s.stacks as Record<string, any>) };
    stacks.triggerProcessed = (stacks.triggerProcessed ?? 0) + toProcess.length;
    return { ...s, stacks, triggerQueue: queue };
  };
  switch (currentPhase) {
    case 'draw':
      return processTriggers(resetReactionWindow({ ...state, phase: 'main' }));
    case 'main':
      return processTriggers(resetReactionWindow({ ...state, phase: 'combat' }));
    case 'combat':
      return processTriggers(resetReactionWindow({ ...state, phase: 'end' }));
    case 'end': {
      // New turn begins: increment turn, reset reaction, set phase to draw, +1 Fate to the new current player
      const nextTurn = state.turn + 1;
      const nextPlayerIdx = nextTurn % state.players.length;
      const nextPlayer = state.players[nextPlayerIdx];
      const resources = { ...(state.resources ?? {}) as Record<string, number> };
      resources[nextPlayer] = Math.min(3, (resources[nextPlayer] ?? 0) + 1);
      return processTriggers(resetReactionWindow({ ...state, turn: nextTurn, phase: 'draw', resources }));
    }
    default:
      return state;
  }
}

function updateTrialsOnPlay(state: MatchState, playerId: string, cardId: string): MatchState {
  const trials = { ...(state.trials ?? {}) } as Record<string, Record<string, number | boolean>>;
  const t = { ...(trials[playerId] ?? {}) } as Record<string, number | boolean>;
  // Sun: accumulate pseudo-damage for wands_* plays (+10 each), complete at >=20
  if (cardId.startsWith('wands_')) {
    const dmg = Number(t.sunDamage ?? 0) + 10;
    t.sunDamage = dmg;
    if (dmg >= 20) t.sun = true;
  }
  // Judgement: track orientation-specific plays for this card id
  const ori = (state.orientations ?? {})[cardId] ?? 'upright';
  if (ori === 'upright') t[`judgement_upright_${cardId}`] = true;
  if (ori === 'reversed') t[`judgement_reversed_${cardId}`] = true;
  if (t[`judgement_upright_${cardId}`] === true && t[`judgement_reversed_${cardId}`] === true) t.judgement = true;
  trials[playerId] = t;
  return { ...state, trials };
}

function updateTrialsOnTurnEnd(state: MatchState): MatchState {
  // Called when ending at phase 'end' before advancing to next turn
  const currentPlayerIdx = state.turn % state.players.length;
  const playerId = state.players[currentPlayerIdx];
  const trials = { ...(state.trials ?? {}) } as Record<string, Record<string, number | boolean>>;
  const t = { ...(trials[playerId] ?? {}) } as Record<string, number | boolean>;
  const fateNow = (state.fate ?? {})[playerId] ?? 0;
  const streak = fateNow >= 3 ? Number(t.moonStreak ?? 0) + 1 : 0;
  t.moonStreak = streak;
  if (streak >= 2) t.moon = true;
  trials[playerId] = t;
  return { ...state, trials };
}

export function applyIntent(state: MatchState, intent: IntentInput): MatchState {
  const parsed = ExtendedIntentSchema.parse(intent as any);
  switch (parsed.type) {
    case 'assign_spread': {
      // Assign spread choices for the player; set consumed flags to false
      const spread = { ...(state.spread ?? {}) } as NonNullable<typeof state.spread>;
      spread[parsed.playerId] = {
        pastId: parsed.pastId,
        presentId: parsed.presentId,
        futureId: parsed.futureId,
        consumed: { past: false, present: false, future: false },
      };
      return { ...state, spread };
    }
    case 'end_turn': {
      // If not at end phase, just advance the phase
      if ((state.phase ?? 'end') !== 'end') {
        return advancePhase(state);
      }
      // End of turn hooks
      const withTrials = updateTrialsOnTurnEnd(state);
      // Advance to next turn and phase 'draw', add +1 Fate to new current player capped at 3
      // The advancePhase function will handle the fate increment
      return advancePhase(withTrials);
    }
    case 'play_card': {
      // Only allow play if card is in hand and has enough resources (cost=1)
      const hands = (state.hands as Record<string, { hand: string[] }>) || {};
      const hand = (hands[parsed.playerId]?.hand ?? []);
      const resources = { ...(state.resources ?? {}) } as Record<string, number>;
      const cost = 1;
      if (!hand.includes(parsed.cardId) || (resources[parsed.playerId] ?? 0) < cost) {
        return state; // reject silently for now
      }
      let finalCost = cost;
      // Apply Present slot bonus: cost -1 on Turn 1 only
      const sp = (state.spread ?? {})[parsed.playerId];
      if (state.turn === 0 && sp?.presentId === parsed.cardId && sp?.consumed?.present === false) {
        finalCost = Math.max(0, finalCost - 1);
      }
      resources[parsed.playerId] = (resources[parsed.playerId] ?? 0) - finalCost;
      const nextHand = hand.filter((c) => c !== parsed.cardId);
      const nextHands = { ...hands, [parsed.playerId]: { hand: nextHand } } as Record<string, { hand: string[] }>;
      const bf = (state.battlefield as Record<string, { played: string[] }>) || {};
      const byPlayer = bf[parsed.playerId] ?? { played: [] };
      const nextByPlayer = { played: [...byPlayer.played, parsed.cardId] };
      const nextBattlefield = { ...bf, [parsed.playerId]: nextByPlayer } as Record<string, { played: string[] }>;
      void createSeededRandom(state.seed);
      // Build next state after paying cost and moving card
      let nextState: MatchState = { ...state, hands: nextHands, battlefield: nextBattlefield, resources };
      // Execute orientation-based effect on play if a simple library entry exists
      const lib = state.cardLibrary ?? {};
      const def: any = lib[parsed.cardId];
      if (def?.upright?.effect && def?.reversed?.effect) {
        const ori = (state.orientations ?? {})[parsed.cardId] ?? 'upright';
        const effectStr = ori === 'upright' ? def.upright.effect : def.reversed.effect;
        const calls = parseEffects([effectStr]);
        nextState = executeEffectsForPlayer(nextState, calls, parsed.playerId, `${state.seed}:play:${parsed.cardId}`);
      }
      // Spread consumption and Past refund
      nextState = updateTrialsOnPlay(nextState, parsed.playerId, parsed.cardId);
      if (sp) {
        const consumed = { ...(sp.consumed ?? {}) } as Record<'past' | 'present' | 'future', boolean | undefined>;
        if (sp.presentId === parsed.cardId && consumed.present === false && state.turn === 0) {
          consumed.present = true;
        }
        if (sp.pastId === parsed.cardId && consumed.past === false && (state.turn === 0 || state.turn === 1)) {
          // Refund +1 Fate after resolution; apply immediately for simplicity
          const fate = { ...nextState.fate } as Record<string, number>;
          fate[parsed.playerId] = Math.min(3, (fate[parsed.playerId] ?? 0) + 1);
          nextState = { ...nextState, fate };
          consumed.past = true;
        }
        const nextSpread = { ...(state.spread ?? {}) } as NonNullable<typeof state.spread>;
        nextSpread[parsed.playerId] = { ...sp, consumed };
        nextState = { ...nextState, spread: nextSpread };
      }
      // Open a reaction window due to board change
      const opened = openReactionWindow(nextState, parsed.playerId);
      return opened;
    }
    case 'draw': {
      const hands = (state.hands as Record<string, { hand: string[] }>) || {};
      const decks = (state.decks as Record<string, { draw: string[]; discard: string[] }>) || {};
      const hand = (hands[parsed.playerId]?.hand ?? []);
      let nextCard = parsed.cardId;
      if (decks[parsed.playerId]?.draw?.length) {
        // draw from deck top if available
        const nextDraw = [...decks[parsed.playerId].draw];
        nextCard = nextDraw.shift() as string;
        const nextDecks = { ...decks, [parsed.playerId]: { ...decks[parsed.playerId], draw: nextDraw } };
        const nextHands = { ...hands, [parsed.playerId]: { hand: [...hand, nextCard] } } as Record<string, { hand: string[] }>;
        return { ...state, hands: nextHands, decks: nextDecks };
      }
      const nextHands = { ...hands, [parsed.playerId]: { hand: [...hand, nextCard] } } as Record<string, { hand: string[] }>;
      return { ...state, hands: nextHands };
    }
    case 'flip_orientation': {
      // Fast: only during an open reaction window
      const rw = state.reactionWindow ?? { open: false, responded: {} };
      if (!rw.open) return state;
      if (rw.responded?.[parsed.playerId]) return state;
      // Fate cost 1
      const fate = { ...state.fate } as Record<string, number>;
      if ((fate[parsed.playerId] ?? 0) < 1) return state;
      fate[parsed.playerId] = (fate[parsed.playerId] ?? 0) - 1;
      // Validate target card belongs to player (in hand or battlefield)
      const hands = (state.hands as Record<string, { hand: string[] }>) || {};
      const bf = (state.battlefield as Record<string, { played: string[] }>) || {};
      const inHand = (hands[parsed.playerId]?.hand ?? []).includes(parsed.cardId);
      const onBoard = (bf[parsed.playerId]?.played ?? []).includes(parsed.cardId);
      if (!inHand && !onBoard) return state;
      const orientations = { ...(state.orientations ?? {}) } as Record<string, 'upright' | 'reversed'>;
      const current = orientations[parsed.cardId] ?? 'upright';
      orientations[parsed.cardId] = current === 'upright' ? 'reversed' : 'upright';
      const responded = { ...(rw.responded ?? {}) } as Record<string, boolean>;
      responded[parsed.playerId] = true;
      // close when both origin and the other player have responded
      const others = state.players.filter((p) => p !== rw.originPlayerId);
      const allResponded = (rw.originPlayerId ? responded[rw.originPlayerId] : true) && others.every((p) => responded[p]);
      const nextRw = { open: !allResponded, responded: allResponded ? Object.fromEntries(state.players.map((p) => [p, false])) : responded };
      return { ...state, fate, orientations, reactionWindow: nextRw };
    }
    case 'peek': {
      // Fast: only during an open reaction window
      const rw = state.reactionWindow ?? { open: false, responded: {} };
      if (!rw.open) return state;
      if (rw.responded?.[parsed.playerId]) return state;
      // Fate cost 1; no deck modeled yet, record intent only
      const fate = { ...state.fate } as Record<string, number>;
      if ((fate[parsed.playerId] ?? 0) < 1) return state;
      fate[parsed.playerId] = (fate[parsed.playerId] ?? 0) - 1;
      // operate on top-2 of deck
      const decks = { ...(state.decks as Record<string, { draw: string[]; discard: string[] }>) };
      const top2 = decks[parsed.playerId]?.draw?.slice(0, 2) ?? [];
      // simple reorder: reverse the top2 as a deterministic choice (UI would choose order)
      if (top2.length >= 2) {
        const nextDraw = [...decks[parsed.playerId].draw];
        const [a, b] = top2;
        nextDraw[0] = b;
        nextDraw[1] = a;
        decks[parsed.playerId] = { ...decks[parsed.playerId], draw: nextDraw };
      }
      const responded = { ...(rw.responded ?? {}) } as Record<string, boolean>;
      responded[parsed.playerId] = true;
      const others = state.players.filter((p) => p !== rw.originPlayerId);
      const allResponded = (rw.originPlayerId ? responded[rw.originPlayerId] : true) && others.every((p) => responded[p]);
      const nextRw = { open: !allResponded, responded: allResponded ? Object.fromEntries(state.players.map((p) => [p, false])) : responded };
      return { ...state, fate, decks, reactionWindow: nextRw };
    }
    case 'force_draw': {
      // Fast: only during an open reaction window
      const rw = state.reactionWindow ?? { open: false, responded: {} };
      if (!rw.open) return state;
      if (rw.responded?.[parsed.playerId]) return state;
      // Fate cost 2; we don't model deck, so record request
      const fate = { ...state.fate } as Record<string, number>;
      if ((fate[parsed.playerId] ?? 0) < 2) return state;
      fate[parsed.playerId] = (fate[parsed.playerId] ?? 0) - 2;
      const decks = { ...(state.decks as Record<string, { draw: string[]; discard: string[] }>) };
      const hands = (state.hands as Record<string, { hand: string[] }>) || {};
      const hand = (hands[parsed.playerId]?.hand ?? []);
      const nextDraw = [...(decks[parsed.playerId]?.draw ?? [])];
      if (nextDraw.length > 0) {
        const card = nextDraw.shift() as string;
        decks[parsed.playerId] = { ...decks[parsed.playerId], draw: nextDraw };
        const nextHands = { ...hands, [parsed.playerId]: { hand: [...hand, card] } } as Record<string, { hand: string[] }>;
        const responded = { ...(rw.responded ?? {}) } as Record<string, boolean>;
        responded[parsed.playerId] = true;
        const allResponded = state.players.every((p) => responded[p]);
        const nextRw = { open: !allResponded, responded: allResponded ? Object.fromEntries(state.players.map((p) => [p, false])) : responded };
        return { ...state, fate, decks, hands: nextHands, reactionWindow: nextRw };
      }
      const responded = { ...(rw.responded ?? {}) } as Record<string, boolean>;
      responded[parsed.playerId] = true;
      const others = state.players.filter((p) => p !== rw.originPlayerId);
      const allResponded = (rw.originPlayerId ? responded[rw.originPlayerId] : true) && others.every((p) => responded[p]);
      const nextRw = { open: !allResponded, responded: allResponded ? Object.fromEntries(state.players.map((p) => [p, false])) : responded };
      return { ...state, fate, reactionWindow: nextRw };
    }
    case 'block_flip': {
      // Fast: only during open reaction window
      const rw = state.reactionWindow ?? { open: false, responded: {} };
      if (!rw.open) return state;
      if (rw.responded?.[parsed.playerId]) return state;
      const stacks = { ...(state.stacks as Record<string, any>) };
      stacks.blockFlipUsed = stacks.blockFlipUsed ?? {};
      if (stacks.blockFlipUsed[parsed.playerId]) return state; // once per game
      // Fate cost 2
      const fate = { ...state.fate } as Record<string, number>;
      if ((fate[parsed.playerId] ?? 0) < 2) return state;
      fate[parsed.playerId] = (fate[parsed.playerId] ?? 0) - 2;
      // basic validation: must target other player
      if (parsed.targetPlayerId === parsed.playerId) return state;
      // optional: ensure target player exists
      if (!state.players.includes(parsed.targetPlayerId)) return state;
      stacks.blockFlipUsed[parsed.playerId] = true;
      const blockLog = Array.isArray(stacks.blockFlipLog) ? stacks.blockFlipLog : [];
      stacks.blockFlipLog = [...blockLog, { by: parsed.playerId, target: parsed.targetPlayerId, cardId: parsed.cardId }];
      const responded = { ...(rw.responded ?? {}) } as Record<string, boolean>;
      responded[parsed.playerId] = true;
      const others = state.players.filter((p) => p !== rw.originPlayerId);
      const allResponded = (rw.originPlayerId ? responded[rw.originPlayerId] : true) && others.every((p) => responded[p]);
      const nextRw = { open: !allResponded, responded: allResponded ? Object.fromEntries(state.players.map((p) => [p, false])) : responded };
      return { ...state, stacks, fate, reactionWindow: nextRw };
    }
    default: {
      return state;
    }
  }
}

export function getScore(state: MatchState, playerId: string): number {
  const bf = state.battlefield as Record<string, { played?: string[] }>;
  const played = bf[playerId]?.played ?? [];
  return played.length;
}

export function checkVictory(state: MatchState, threshold = 3): string | null {
  // Trials: if a player has 3 completed trials (boolean=true), they win
  const trials = state.trials ?? {};
  for (const p of state.players) {
    const t = trials[p] || {};
    const completed = Object.values(t).filter((v) => v === true).length;
    if (completed >= 3) return p;
  }
  // Fall back to score threshold
  for (const p of state.players) {
    if (getScore(state, p) >= threshold) return p;
  }
  return null;
}

export function replay(state: MatchState, intents: IntentInput[], threshold = 3): SimulationResult {
  let current = state;
  for (const intent of intents) {
    current = applyIntent(current, intent);
    const winner = checkVictory(current, threshold);
    if (winner) return { state: current, winnerId: winner };
  }
  return { state: current, winnerId: checkVictory(current, threshold) };
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
