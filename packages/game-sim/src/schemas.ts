import { z } from 'zod';

export const CardEffectSchema = z.object({
  effect: z.string().min(1),
});

export const CardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  suit: z.enum(['wands', 'cups', 'swords', 'pentacles', 'major']),
  cost: z.number().int().min(0),
  type: z.enum(['spell', 'unit', 'artifact']),
  upright: CardEffectSchema,
  reversed: CardEffectSchema,
  tags: z.array(z.string()).default([]),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  set: z.string().min(1),
});

export const DeckSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  cards: z.array(z.string()),
  majors: z.array(z.string()),
  format: z.enum(['standard', 'wild', 'pve']),
});

export const MatchStateSchema = z.object({
  matchId: z.string().min(1),
  seed: z.string().min(1),
  players: z.array(z.string()).min(1),
  turn: z.number().int().min(0),
  fate: z.record(z.number().int()),
  stacks: z.record(z.unknown()),
  battlefield: z.record(z.unknown()),
  hands: z.record(z.unknown()),
});

export const IntentPlayCardSchema = z.object({
  type: z.literal('play_card'),
  playerId: z.string(),
  cardId: z.string(),
  target: z.string().optional(),
});

export const IntentEndTurnSchema = z.object({
  type: z.literal('end_turn'),
  playerId: z.string(),
});

export const IntentDrawSchema = z.object({
  type: z.literal('draw'),
  playerId: z.string(),
  cardId: z.string(),
});

export const IntentSchema = z.discriminatedUnion('type', [
  IntentPlayCardSchema,
  IntentEndTurnSchema,
  IntentDrawSchema,
]);

export type CardInput = z.infer<typeof CardSchema>;
export type DeckInput = z.infer<typeof DeckSchema>;
export type MatchStateInput = z.infer<typeof MatchStateSchema>;
export type IntentInput = z.infer<typeof IntentSchema>;
