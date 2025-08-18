/**
 * Tarot TCG Extensions for game-sim
 * Extends the base game simulation with Tarot-specific mechanics
 */

import type { MatchState } from './types.js';
import { applyIntent } from './sim.js';

export interface TarotMatchState extends MatchState {
	// Card orientations (upright/reversed)
	orientations?: Record<string, 'upright' | 'reversed'>;
	
	// Spread slots (Past/Present/Future)
	spread?: Record<string, {
		pastId?: string;
		presentId?: string;
		futureId?: string;
		consumed?: Record<'past' | 'present' | 'future', boolean>;
	}>;
	
	// Arcana Trials tracking
	trials?: Record<string, Record<string, number | boolean>>;
	
	// Major Arcana charging
	majorArcanaCharge?: Record<string, number>;
	
	// Suit combat styles
	suitStyles?: Record<string, {
		style: string;
		effect: string;
		damage_bonus?: number;
		heal_amount?: number;
		counter_damage?: number;
		shield?: number;
	}>;
	
	// Channeling system
	channeling?: {
		cardId?: string;
		turns: number;
		effect?: string;
	};
	
	// Combat lanes (6 lanes)
	lanes?: Record<string, {
		attacker?: string;
		defender?: string;
		element?: 'fire' | 'water' | 'air' | 'earth';
	}[]>;
	
	// Elemental interactions
	elementalEffects?: {
		fireVsWater: number;  // Damage modifier
		airVsEarth: number;
		waterVsFire: number;
		earthVsAir: number;
	};
}

/**
 * Initialize Tarot-specific state
 */
export function initializeTarotState(base: MatchState): TarotMatchState {
	return {
		...base,
		orientations: {},
		spread: {},
		trials: Object.fromEntries(base.players.map(p => [p, {}])),
		majorArcanaCharge: Object.fromEntries(base.players.map(p => [p, 0])),
		suitStyles: {
			wands: { style: 'aggressive', effect: 'burn', damage_bonus: 2 },
			cups: { style: 'defensive', effect: 'heal', heal_amount: 2 },
			swords: { style: 'precise', effect: 'counter', counter_damage: 1 },
			pentacles: { style: 'slow', effect: 'inevitable', shield: 1 }
		},
		channeling: { turns: 0 },
		lanes: Object.fromEntries(base.players.map(p => [p, Array(6).fill(null).map(() => ({}))])),
		elementalEffects: {
			fireVsWater: -0.5,  // Fire weak to Water
			waterVsFire: 1.5,   // Water strong vs Fire
			airVsEarth: -0.5,   // Air weak to Earth
			earthVsAir: 1.5     // Earth strong vs Air
		}
	};
}

/**
 * Apply Major Arcana charging
 */
export function chargeMajorArcana(state: TarotMatchState, playerId: string, cardId: string): TarotMatchState {
	if (!cardId.startsWith('major_')) return state;
	
	const charge = { ...(state.majorArcanaCharge ?? {}) };
	charge[playerId] = Math.min(100, (charge[playerId] ?? 0) + 10);
	
	return { ...state, majorArcanaCharge: charge };
}

/**
 * Activate Major Arcana ultimate ability
 */
export function activateMajorArcanaUltimate(state: TarotMatchState, playerId: string): TarotMatchState {
	const charge = state.majorArcanaCharge?.[playerId] ?? 0;
	if (charge < 100) return state;
	
	// Reset charge
	const newCharge = { ...(state.majorArcanaCharge ?? {}) };
	newCharge[playerId] = 0;
	
	// Apply ultimate effect based on significator
	// This would be customized per Major Arcana card
	return {
		...state,
		majorArcanaCharge: newCharge,
		// Add ultimate effect processing here
	};
}

/**
 * Process suit combat styles
 */
export function applySuitStyle(state: TarotMatchState, cardId: string, playerId: string): TarotMatchState {
	const suit = getSuitFromCardId(cardId);
	if (!suit) return state;
	
	const style = state.suitStyles?.[suit];
	if (!style) return state;
	
	let nextState = state;
	
	switch (style.effect) {
		case 'burn':
			// Apply burn damage over time
			nextState = applyBurnEffect(nextState, playerId, style.damage_bonus ?? 0);
			break;
		case 'heal':
			// Heal player
			nextState = applyHealEffect(nextState, playerId, style.heal_amount ?? 0);
			break;
		case 'counter':
			// Set up counter-attack
			nextState = setupCounterAttack(nextState, playerId, style.counter_damage ?? 0);
			break;
		case 'inevitable':
			// Add shield
			nextState = addShield(nextState, playerId, style.shield ?? 0);
			break;
	}
	
	return nextState;
}

/**
 * Calculate elemental interaction damage
 */
export function calculateElementalDamage(
	state: TarotMatchState,
	attackerElement: string,
	defenderElement: string,
	baseDamage: number
): number {
	const effects = state.elementalEffects;
	if (!effects) return baseDamage;
	
	// Check for elemental advantage/disadvantage
	if (attackerElement === 'fire' && defenderElement === 'water') {
		return Math.floor(baseDamage * (1 + effects.fireVsWater));
	}
	if (attackerElement === 'water' && defenderElement === 'fire') {
		return Math.floor(baseDamage * (1 + effects.waterVsFire));
	}
	if (attackerElement === 'air' && defenderElement === 'earth') {
		return Math.floor(baseDamage * (1 + effects.airVsEarth));
	}
	if (attackerElement === 'earth' && defenderElement === 'air') {
		return Math.floor(baseDamage * (1 + effects.earthVsAir));
	}
	
	return baseDamage;
}

/**
 * Process channeling maintenance
 */
export function maintainChanneling(state: TarotMatchState, cardId: string): TarotMatchState {
	if (!state.channeling || state.channeling.cardId !== cardId) {
		// Start new channeling
		return {
			...state,
			channeling: {
				cardId,
				turns: 1,
				effect: getChannelingEffect(cardId)
			}
		};
	}
	
	// Continue channeling
	const turns = state.channeling.turns + 1;
	
	// Apply increasing effect based on turns channeled
	return {
		...state,
		channeling: {
			...state.channeling,
			turns
		}
	};
}

/**
 * Release channeled energy
 */
export function releaseChanneling(state: TarotMatchState): TarotMatchState {
	if (!state.channeling || !state.channeling.cardId) return state;
	
	const turns = state.channeling.turns;
	const multiplier = Math.min(turns, 5); // Cap at 5x
	
	// Apply amplified effect
	// This would trigger the channeled effect with multiplier
	
	return {
		...state,
		channeling: { turns: 0 }
	};
}

// Helper functions
function getSuitFromCardId(cardId: string): string | null {
	if (cardId.startsWith('wands_')) return 'wands';
	if (cardId.startsWith('cups_')) return 'cups';
	if (cardId.startsWith('swords_')) return 'swords';
	if (cardId.startsWith('pentacles_')) return 'pentacles';
	return null;
}

function getChannelingEffect(cardId: string): string {
	// Map card to its channeling effect
	// This would be loaded from card database
	return 'damage(X)';
}

function applyBurnEffect(state: TarotMatchState, playerId: string, damage: number): TarotMatchState {
	// Apply burn damage over time
	// Would modify state to add burn status
	return state;
}

function applyHealEffect(state: TarotMatchState, playerId: string, amount: number): TarotMatchState {
	// Heal player
	// Would modify player health in state
	return state;
}

function setupCounterAttack(state: TarotMatchState, playerId: string, damage: number): TarotMatchState {
	// Set up counter-attack trigger
	// Would add counter status to state
	return state;
}

function addShield(state: TarotMatchState, playerId: string, amount: number): TarotMatchState {
	// Add shield/armor to player
	// Would modify player defense in state
	return state;
}

/**
 * Export enhanced intent types
 */
export interface TarotIntent {
	type: 'flip_orientation' | 'peek' | 'force_draw' | 'block_flip' | 
		  'channel_maintain' | 'channel_release' | 'major_ultimate' |
		  'assign_spread' | 'play_card' | 'end_turn' | 'draw';
	playerId: string;
	cardId?: string;
	targetPlayerId?: string;
	laneIndex?: number;
	spreadSlot?: 'past' | 'present' | 'future';
}

/**
 * Process Tarot-specific intents
 */
export function processTarotIntent(state: TarotMatchState, intent: TarotIntent): TarotMatchState {
	switch (intent.type) {
		case 'channel_maintain':
			return maintainChanneling(state, intent.cardId!);
			
		case 'channel_release':
			return releaseChanneling(state);
			
		case 'major_ultimate':
			return activateMajorArcanaUltimate(state, intent.playerId);
			
		default:
			// Fall back to base intent processing
			return applyIntent(state, intent as any) as TarotMatchState;
	}
}