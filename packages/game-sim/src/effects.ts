// Effects compatibility shim
import type { MatchState } from './types.js';

export function parseEffect(input: string) {
  return { name: input, args: [] };
}

export function parseEffects(effectStrings: string[]) {
  return effectStrings.map(parseEffect);
}

export function executeEffectForPlayer(state: MatchState, effect: any, playerId: string, seed: string): MatchState {
  console.warn('executeEffectForPlayer is deprecated. Effects are now handled through keywords');
  return state;
}

export function executeEffectsForPlayer(state: MatchState, effects: any[], playerId: string, seed: string): MatchState {
  return effects.reduce((s, e) => executeEffectForPlayer(s, e, playerId, seed), state);
}