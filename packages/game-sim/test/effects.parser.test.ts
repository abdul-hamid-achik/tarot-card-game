import { describe, it, expect } from 'vitest';
import { parseEffect, parseEffects } from '../src/effects.js';

describe('Effect parser', () => {
  it('parses simple call with args', () => {
    const e = parseEffect('silence(target, 1)');
    expect(e).toEqual({ name: 'silence', args: ['target', 1] });
  });

  it('parses call without args', () => {
    const e = parseEffect('shuffle()');
    expect(e).toEqual({ name: 'shuffle', args: [] });
  });

  it('parses multiple effects', () => {
    const es = parseEffects(['gain(2)', 'both_discard_random(1)']);
    expect(es).toEqual([{ name: 'gain', args: [2] }, { name: 'both_discard_random', args: [1] }]);
  });
});
