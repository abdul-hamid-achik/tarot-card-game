import { z } from 'zod';
import type { MatchState } from './types.js';
import { createSeededRandom } from './rng.js';

export const EffectArgSchema = z.union([
  z.number(),
  z.string().min(1),
]);

export const EffectCallSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  args: z.array(EffectArgSchema),
});

export type EffectCall = z.infer<typeof EffectCallSchema>;

export function parseEffect(input: string): EffectCall {
  const match = input.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)\s*$/);
  if (!match) {
    return EffectCallSchema.parse({ name: input.trim(), args: [] });
  }
  const [, name, rawArgs] = match;
  const args = rawArgs.trim() === ''
    ? []
    : rawArgs.split(',').map((a) => a.trim()).map((a) => {
        const n = Number(a);
        if (!Number.isNaN(n) && Number.isFinite(n)) return n;
        return a;
      });
  return EffectCallSchema.parse({ name, args });
}

export function parseEffects(effectStrings: string[]): EffectCall[] {
  return effectStrings.map(parseEffect);
}

export function executeEffectForPlayer(state: MatchState, effect: EffectCall, playerId: string, seed: string): MatchState {
  void createSeededRandom(seed);
  switch (effect.name) {
    case 'gain': {
      const amount = Number(effect.args[0] ?? 0) || 0;
      const next = { ...(state.resources ?? {}) } as Record<string, number>;
      next[playerId] = (next[playerId] ?? 0) + amount;
      return { ...state, resources: next };
    }
    case 'silence': {
      // Placeholder: no-op until we model units/statuses; validated by parser
      return state;
    }
    default:
      return state;
  }
}

export function executeEffectsForPlayer(state: MatchState, effects: EffectCall[], playerId: string, seed: string): MatchState {
  let s = state;
  for (const e of effects) {
    s = executeEffectForPlayer(s, e, playerId, seed);
  }
  return s;
}
