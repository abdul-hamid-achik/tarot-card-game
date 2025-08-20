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
  spellSpeed: z.enum(['burst', 'fast', 'slow']).optional(), // For spells only
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
  resources: z.record(z.number().int()).optional(),
  stacks: z.record(z.unknown()),
  battlefield: z.record(z.unknown()),
  hands: z.record(z.unknown()),
  phase: z.enum(['draw', 'main', 'combat', 'end']).optional(),
  // Priority and pass tracking
  priorityPlayer: z.string().optional(),
  passedPlayers: z.array(z.string()).optional(),
  attackTokenOwner: z.string().optional(),
  // Reaction and spell stack
  reactionWindow: z.object({ open: z.boolean(), responded: z.record(z.boolean()), originPlayerId: z.string().optional() }).optional(),
  spellStack: z.array(z.object({ 
    id: z.string(), 
    playerId: z.string(), 
    cardId: z.string(),
    spellSpeed: z.enum(['burst', 'fast', 'slow']).optional(),
    targets: z.array(z.string()).optional()
  })).optional(),
  triggerQueue: z.array(z.object({ id: z.string(), playerId: z.string().optional() })).optional(),
  trials: z.record(z.record(z.union([z.number(), z.boolean()]))).optional(),
  orientations: z.record(z.enum(['upright', 'reversed'])).optional(),
  spread: z.record(z.object({
    pastId: z.string().optional(),
    presentId: z.string().optional(),
    futureId: z.string().optional(),
    consumed: z.object({ past: z.boolean().optional(), present: z.boolean().optional(), future: z.boolean().optional() }).optional()
  })).optional(),
  decks: z.record(z.object({ draw: z.array(z.string()), discard: z.array(z.string()) })).optional(),
});

export const IntentPlayCardSchema = z.object({
  type: z.literal('play_card'),
  playerId: z.string(),
  cardId: z.string(),
  target: z.string().optional(),
});

export const IntentPassSchema = z.object({
  type: z.literal('pass'),
  playerId: z.string(),
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
  IntentPassSchema,
  IntentEndTurnSchema,
  IntentDrawSchema,
]);

export const IntentFlipOrientationSchema = z.object({
  type: z.literal('flip_orientation'),
  playerId: z.string(),
  cardId: z.string(),
});

export const IntentPeekSchema = z.object({
  type: z.literal('peek'),
  playerId: z.string(),
  count: z.literal(2),
});

export const IntentForceDrawSchema = z.object({
  type: z.literal('force_draw'),
  playerId: z.string(),
});

export const IntentBlockFlipSchema = z.object({
  type: z.literal('block_flip'),
  playerId: z.string(),
  targetPlayerId: z.string(),
  cardId: z.string(),
});

export const ExtendedIntentSchema = z.discriminatedUnion('type', [
  IntentPlayCardSchema,
  IntentPassSchema,
  IntentEndTurnSchema,
  IntentDrawSchema,
  IntentFlipOrientationSchema,
  IntentPeekSchema,
  IntentForceDrawSchema,
  IntentBlockFlipSchema,
  z.object({
    type: z.literal('assign_spread'),
    playerId: z.string(),
    pastId: z.string().optional(),
    presentId: z.string().optional(),
    futureId: z.string().optional(),
  }),
  z.object({
    type: z.literal('initiate_combat'),
    playerId: z.string(),
  }),
]);

export type CardInput = z.infer<typeof CardSchema>;
export type DeckInput = z.infer<typeof DeckSchema>;
export type MatchStateInput = z.infer<typeof MatchStateSchema>;
export type IntentInput = z.infer<typeof IntentSchema>;
export type ExtendedIntentInput = z.infer<typeof ExtendedIntentSchema>;
