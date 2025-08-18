import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Fate Actions', () => {
	describe('Peek (Scrying)', () => {
		it('should allow peek during reaction window for 1 Fate', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withDeck = {
				...base,
				fate: { p1: 2, p2: 0 },
				decks: { 
					p1: { draw: ['c1', 'c2', 'c3', 'c4'], discard: [] },
					p2: { draw: [], discard: [] }
				},
				reactionWindow: { open: true, responded: { p1: false, p2: false } }
			} as typeof base;
			
			const s1 = applyIntent(withDeck, { type: 'peek', playerId: 'p1' });
			expect((s1.fate as any)['p1']).toBe(1); // Cost 1 Fate
			
			// Top 2 cards should be reordered
			const deck = (s1.decks as any)['p1'].draw;
			expect(deck[0]).toBe('c2'); // Swapped
			expect(deck[1]).toBe('c1'); // Swapped
			expect(deck[2]).toBe('c3'); // Unchanged
		});
	});

	describe('Force Draw', () => {
		it('should draw a card for 2 Fate during reaction window', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withDeck = {
				...base,
				fate: { p1: 3, p2: 0 },
				hands: { p1: { hand: ['existing'] }, p2: { hand: [] } },
				decks: {
					p1: { draw: ['new_card', 'c2'], discard: [] },
					p2: { draw: [], discard: [] }
				},
				reactionWindow: { open: true, responded: { p1: false, p2: false } }
			} as typeof base;
			
			const s1 = applyIntent(withDeck, { type: 'force_draw', playerId: 'p1' });
			expect((s1.fate as any)['p1']).toBe(1); // Cost 2 Fate
			expect((s1.hands as any)['p1'].hand).toContain('new_card');
			expect((s1.decks as any)['p1'].draw).not.toContain('new_card');
		});

		it('should not allow force draw without enough Fate', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withDeck = {
				...base,
				fate: { p1: 1, p2: 0 }, // Only 1 Fate
				hands: { p1: { hand: [] }, p2: { hand: [] } },
				decks: {
					p1: { draw: ['c1'], discard: [] },
					p2: { draw: [], discard: [] }
				},
				reactionWindow: { open: true, responded: { p1: false, p2: false } }
			} as typeof base;
			
			const s1 = applyIntent(withDeck, { type: 'force_draw', playerId: 'p1' });
			expect((s1.fate as any)['p1']).toBe(1); // Unchanged
			expect((s1.hands as any)['p1'].hand.length).toBe(0); // No card drawn
		});
	});

	describe('Block Flip', () => {
		it('should block opponent flip for 2 Fate once per game', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withSetup = {
				...base,
				fate: { p1: 3, p2: 0 },
				reactionWindow: { open: true, responded: { p1: false, p2: false }, originPlayerId: 'p2' },
				stacks: {}
			} as typeof base;
			
			const s1 = applyIntent(withSetup, { 
				type: 'block_flip', 
				playerId: 'p1',
				targetPlayerId: 'p2',
				cardId: 'major_00'
			});
			
			expect((s1.fate as any)['p1']).toBe(1); // Cost 2 Fate
			expect((s1.stacks as any).blockFlipUsed?.['p1']).toBe(true);
			expect((s1.stacks as any).blockFlipLog).toHaveLength(1);
		});

		it('should prevent second block flip from same player', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withUsed = {
				...base,
				fate: { p1: 3, p2: 0 },
				reactionWindow: { open: true, responded: { p1: false, p2: false } },
				stacks: { blockFlipUsed: { p1: true } }
			} as typeof base;
			
			const s1 = applyIntent(withUsed, {
				type: 'block_flip',
				playerId: 'p1',
				targetPlayerId: 'p2',
				cardId: 'major_00'
			});
			
			expect((s1.fate as any)['p1']).toBe(3); // No Fate spent
			expect((s1.stacks as any).blockFlipLog).toBeUndefined(); // No log entry
		});
	});

	describe('Fate Generation', () => {
		it('should generate 1 Fate per turn up to max 3', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withFate = { ...base, fate: { p1: 1, p2: 1 } };
			
			// End turn to advance to next player's turn
			let state = withFate;
			for (let i = 0; i < 4; i++) {
				state = applyIntent(state, { type: 'end_turn', playerId: 'p1' });
			}
			
			expect(state.turn).toBe(1);
			// Player p2 gets +1 Fate when their turn starts
			expect((state.fate as any)['p2']).toBeLessThanOrEqual(3);
		});

		it('should cap Fate at 3', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const maxFate = { ...base, fate: { p1: 3, p2: 3 }, turn: 0 };
			
			// Advance turn
			let state = maxFate;
			for (let i = 0; i < 4; i++) {
				state = applyIntent(state, { type: 'end_turn', playerId: 'p1' });
			}
			
			expect((state.fate as any)['p2']).toBe(3); // Still capped at 3
		});
	});
});