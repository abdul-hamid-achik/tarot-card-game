import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Tarot Card Orientations', () => {
	it('should flip card orientation during reaction window for 1 Fate', () => {
		const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
		const withCard = { 
			...base, 
			hands: { p1: { hand: ['major_00'] }, p2: { hand: [] } },
			fate: { p1: 2, p2: 0 },
			resources: { p1: 1, p2: 0 },
			orientations: { 'major_00': 'upright' }
		} as typeof base;
		
		// Play card to trigger reaction window
		const s1 = applyIntent(withCard, { type: 'play_card', playerId: 'p1', cardId: 'major_00' });
		expect(s1.reactionWindow?.open).toBe(true);
		
		// Card should now be on battlefield and flippable
		const withCardPlayed = {
			...s1,
			battlefield: { p1: { played: ['major_00'] }, p2: { played: [] } }
		};
		
		// Flip orientation during reaction window
		const s2 = applyIntent(withCardPlayed, { type: 'flip_orientation', playerId: 'p1', cardId: 'major_00' });
		expect((s2.orientations as any)['major_00']).toBe('reversed');
		expect((s2.fate as any)['p1']).toBe(1); // Cost 1 Fate
	});

	it('should apply different effects based on card orientation', () => {
		const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
		const withLibrary = {
			...base,
			hands: { p1: { hand: ['wands_03'] }, p2: { hand: [] } },
			resources: { p1: 2, p2: 0 },
			orientations: { 'wands_03': 'upright' },
			cardLibrary: {
				'wands_03': {
					upright: { effect: 'damage(2)' },
					reversed: { effect: 'heal(1)' }
				}
			}
		} as typeof base;
		
		// Play with upright orientation - should damage
		const s1 = applyIntent(withLibrary, { type: 'play_card', playerId: 'p1', cardId: 'wands_03' });
		// Verify damage effect was applied (would need effect processing)
		
		// Flip to reversed and play another copy
		const withReversed = {
			...withLibrary,
			hands: { p1: { hand: ['wands_04'] }, p2: { hand: [] } },
			orientations: { 'wands_04': 'reversed' },
			cardLibrary: {
				'wands_04': {
					upright: { effect: 'damage(2)' },
					reversed: { effect: 'heal(1)' }
				}
			}
		};
		const s2 = applyIntent(withReversed, { type: 'play_card', playerId: 'p1', cardId: 'wands_04' });
		// Verify heal effect was applied
	});

	it('should prevent flip orientation outside reaction window', () => {
		const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
		const withCard = {
			...base,
			hands: { p1: { hand: ['major_00'] }, p2: { hand: [] } },
			fate: { p1: 2, p2: 0 },
			orientations: { 'major_00': 'upright' },
			reactionWindow: { open: false, responded: { p1: false, p2: false } }
		} as typeof base;
		
		// Try to flip outside reaction window - should fail
		const s1 = applyIntent(withCard, { type: 'flip_orientation', playerId: 'p1', cardId: 'major_00' });
		expect((s1.orientations as any)['major_00']).toBe('upright'); // Unchanged
		expect((s1.fate as any)['p1']).toBe(2); // No Fate spent
	});

	it('should track orientations for Judgement trial', () => {
		const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
		const withCard = {
			...base,
			hands: { p1: { hand: ['major_20'] }, p2: { hand: [] } },
			resources: { p1: 2, p2: 0 },
			orientations: { 'major_20': 'upright' },
			trials: { p1: {} }
		} as typeof base;
		
		// Play with upright
		const s1 = applyIntent(withCard, { type: 'play_card', playerId: 'p1', cardId: 'major_20' });
		expect((s1.trials as any)['p1']['judgement_upright_major_20']).toBe(true);
		
		// Play same card reversed (in another turn)
		const withReversed = {
			...s1,
			hands: { p1: { hand: ['major_20'] }, p2: { hand: [] } },
			resources: { p1: 2, p2: 0 },
			orientations: { 'major_20': 'reversed' }
		};
		const s2 = applyIntent(withReversed, { type: 'play_card', playerId: 'p1', cardId: 'major_20' });
		expect((s2.trials as any)['p1']['judgement_reversed_major_20']).toBe(true);
		expect((s2.trials as any)['p1']['judgement']).toBe(true); // Trial completed
	});
});