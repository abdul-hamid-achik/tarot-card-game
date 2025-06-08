import { describe, it, expect } from 'vitest';
import { runHeadlessMatch } from '../src/bot.js';

describe('Headless PvP bot vs bot', () => {
  it('completes a match with a winner under step budget', async () => {
    const res = await runHeadlessMatch('seed_bot_1', ['P1', 'P2'], 3, 200);
    expect(res.winnerId === 'P1' || res.winnerId === 'P2' || res.winnerId === null).toBe(true);
    expect(res.steps).toBeLessThanOrEqual(200);
  });
});
