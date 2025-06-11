import { stableStringify } from './serialize.js';
import type { IntentInput } from './schemas.js';
import type { MatchState } from './types.js';
import { applyIntent } from './sim.js';

export interface GoldenStepSnapshot {
  idx: number;
  intent: IntentInput;
  stateJSON: string;
}

export function createGoldenTimeline(state: MatchState, intents: IntentInput[]): GoldenStepSnapshot[] {
  const snapshots: GoldenStepSnapshot[] = [];
  let s = state;
  intents.forEach((intent, idx) => {
    s = applyIntent(s, intent);
    snapshots.push({ idx, intent, stateJSON: stableStringify(s) });
  });
  return snapshots;
}
