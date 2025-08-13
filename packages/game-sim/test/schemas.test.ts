import { describe, it, expect } from 'vitest';
import { CardSchema, DeckSchema, MatchStateSchema, IntentSchema, ExtendedIntentSchema } from '../src/schemas.js';

describe('Zod schemas', () => {
  it('validates a minimal card', () => {
    const parsed = CardSchema.parse({
      id: 'swords_02',
      name: 'two of swords',
      suit: 'swords',
      cost: 2,
      type: 'spell',
      upright: { effect: 'silence(target,1)' },
      reversed: { effect: 'both_discard_random(1)' },
      tags: ['control', 'discard'],
      rarity: 'common',
      set: 'base',
    });
    expect(parsed.id).toBe('swords_02');
  });

  it('validates a deck', () => {
    const parsed = DeckSchema.parse({
      id: 'deck_123',
      ownerId: 'u_abc',
      cards: ['swords_02', 'cups_05'],
      majors: ['death_13'],
      format: 'standard',
    });
    expect(parsed.cards.length).toBe(2);
  });

  it('validates match state', () => {
    const parsed = MatchStateSchema.parse({
      matchId: 'm_456',
      seed: 'a1b2c3',
      players: ['u_abc', 'u_xyz'],
      turn: 7,
      fate: { u_abc: 3, u_xyz: 1 },
      stacks: {},
      battlefield: {},
      hands: {},
    });
    expect(parsed.turn).toBe(7);
  });

  it('validates intents', () => {
    const play = IntentSchema.parse({ type: 'play_card', playerId: 'u_abc', cardId: 'swords_02' });
    expect(play.type).toBe('play_card');
    const end = IntentSchema.parse({ type: 'end_turn', playerId: 'u_abc' });
    expect(end.type).toBe('end_turn');
  });

  it('validates extended intents', () => {
    expect(ExtendedIntentSchema.parse({ type: 'flip_orientation', playerId: 'u_abc', cardId: 'swords_02' }).type).toBe('flip_orientation');
    expect(ExtendedIntentSchema.parse({ type: 'peek', playerId: 'u_abc', count: 2 }).type).toBe('peek');
    expect(ExtendedIntentSchema.parse({ type: 'force_draw', playerId: 'u_abc' }).type).toBe('force_draw');
    expect(ExtendedIntentSchema.parse({ type: 'block_flip', playerId: 'u_abc', targetPlayerId: 'u_xyz', cardId: 'swords_02' }).type).toBe('block_flip');
  });
});
