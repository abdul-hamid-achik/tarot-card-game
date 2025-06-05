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

export function executeEffect(state: MatchState, effect: EffectCall, seed: string): MatchState {
  // Placeholder: deterministic no-op execution
  void createSeededRandom(seed);
  return state;
}

export function executeEffects(state: MatchState, effects: EffectCall[], seed: string): MatchState {
  let s = state;
  for (const e of effects) {
    s = executeEffect(s, e, seed);
  }
  return s;
}
