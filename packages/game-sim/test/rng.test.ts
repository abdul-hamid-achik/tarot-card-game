import { describe, it, expect } from 'vitest';
import { createSeededRandom } from '../src/rng.js';

describe('Seeded RNG', () => {
  it('is deterministic for the same seed', () => {
    const r1 = createSeededRandom('a1b2c3');
    const r2 = createSeededRandom('a1b2c3');
    const seq1 = Array.from({ length: 5 }, () => r1.next());
    const seq2 = Array.from({ length: 5 }, () => r2.next());
    expect(seq1).toEqual(seq2);
  });

  it('differs for different seeds', () => {
    const r1 = createSeededRandom('seed-x');
    const r2 = createSeededRandom('seed-y');
    const seq1 = Array.from({ length: 5 }, () => r1.next());
    const seq2 = Array.from({ length: 5 }, () => r2.next());
    expect(seq1).not.toEqual(seq2);
  });
});
