import { stableStringify } from './serialize.js';
import type { IntentInput } from './schemas.js';
import type { MatchState } from './types.js';
import { TarotLorSimulator } from './tarot-lor-simulator.js';

export interface GoldenStepSnapshot {
  idx: number;
  intent: IntentInput;
  stateJSON: string;
}

export function createGoldenTimeline(state: MatchState, intents: IntentInput[]): GoldenStepSnapshot[] {
  const snapshots: GoldenStepSnapshot[] = [];
  let s = state;
  intents.forEach((intent, idx) => {
    // Convert old intent to new action format
    const action = {
      ...intent
    };
    s = TarotLorSimulator.processAction(s, action);
    snapshots.push({ idx, intent, stateJSON: stableStringify(s) });
  });
  return snapshots;
}
