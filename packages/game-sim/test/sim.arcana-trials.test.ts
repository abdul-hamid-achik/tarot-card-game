import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent, checkVictory } from '../src/sim.js';

describe('Arcana Trials', () => {
	describe('Sun Trial', () => {
		it('should accumulate damage from Wands cards toward Sun trial', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withWands = {
				...base,
				hands: { p1: { hand: ['wands_01', 'wands_02'] }, p2: { hand: [] } },
				resources: { p1: 3, p2: 0 },
				trials: { p1: {}, p2: {} }
			} as typeof base;
			
			// Play first Wands card
			const s1 = applyIntent(withWands, { type: 'play_card', playerId: 'p1', cardId: 'wands_01' });
			expect((s1.trials as any)['p1'].sunDamage).toBe(10);
			expect((s1.trials as any)['p1'].sun).toBeUndefined();
			
			// Play second Wands card to complete Sun trial
			const s2 = applyIntent({
				...s1,
				hands: { p1: { hand: ['wands_02'] }, p2: { hand: [] } },
				resources: { p1: 2, p2: 0 }
			} as typeof base, { type: 'play_card', playerId: 'p1', cardId: 'wands_02' });
			
			expect((s2.trials as any)['p1'].sunDamage).toBe(20);
			expect((s2.trials as any)['p1'].sun).toBe(true);
		});

		it('should require 20+ damage from Wands for Sun completion', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withProgress = {
				...base,
				trials: { p1: { sunDamage: 19 }, p2: {} },
				hands: { p1: { hand: ['wands_03'] }, p2: { hand: [] } },
				resources: { p1: 1, p2: 0 }
			} as typeof base;
			
			const s1 = applyIntent(withProgress, { type: 'play_card', playerId: 'p1', cardId: 'wands_03' });
			expect((s1.trials as any)['p1'].sunDamage).toBeGreaterThanOrEqual(20);
			expect((s1.trials as any)['p1'].sun).toBe(true);
		});
	});

	describe('Moon Trial', () => {
		it('should track Fate streaks across turns for Moon trial', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withFate = {
				...base,
				fate: { p1: 3, p2: 0 },
				trials: { p1: {}, p2: {} },
				turn: 0
			} as typeof base;
			
			// End turn with 3 Fate - streak starts
			let state = withFate;
			for (let i = 0; i < 4; i++) {
				state = applyIntent(state, { type: 'end_turn', playerId: 'p1' });
			}
			expect((state.trials as any)['p1'].moonStreak).toBe(1);
			
			// Maintain 3 Fate for another turn
			const withMoreFate = { ...state, fate: { p1: 3, p2: 1 } };
			let state2 = withMoreFate;
			for (let i = 0; i < 4; i++) {
				state2 = applyIntent(state2, { type: 'end_turn', playerId: 'p1' });
			}
			// Moon trial should complete with 2-turn streak
			expect((state2.trials as any)['p1'].moonStreak).toBeGreaterThanOrEqual(2);
			expect((state2.trials as any)['p1'].moon).toBe(true);
		});

		it('should reset Moon streak if Fate drops below 3', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withStreak = {
				...base,
				fate: { p1: 2, p2: 0 }, // Less than 3
				trials: { p1: { moonStreak: 1 }, p2: {} }
			} as typeof base;
			
			// End turn with less than 3 Fate
			let state = withStreak;
			for (let i = 0; i < 4; i++) {
				state = applyIntent(state, { type: 'end_turn', playerId: 'p1' });
			}
			expect((state.trials as any)['p1'].moonStreak).toBe(0); // Reset
		});
	});

	describe('Judgement Trial', () => {
		it('should complete when playing same card in both orientations', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withCard = {
				...base,
				hands: { p1: { hand: ['major_20'] }, p2: { hand: [] } },
				resources: { p1: 2, p2: 0 },
				orientations: { 'major_20': 'upright' },
				trials: { p1: {}, p2: {} }
			} as typeof base;
			
			// Play upright
			const s1 = applyIntent(withCard, { type: 'play_card', playerId: 'p1', cardId: 'major_20' });
			expect((s1.trials as any)['p1']['judgement_upright_major_20']).toBe(true);
			expect((s1.trials as any)['p1'].judgement).toBeUndefined();
			
			// Play reversed version
			const withReversed = {
				...s1,
				hands: { p1: { hand: ['major_20'] }, p2: { hand: [] } },
				resources: { p1: 2, p2: 0 },
				orientations: { 'major_20': 'reversed' }
			};
			const s2 = applyIntent(withReversed, { type: 'play_card', playerId: 'p1', cardId: 'major_20' });
			expect((s2.trials as any)['p1']['judgement_reversed_major_20']).toBe(true);
			expect((s2.trials as any)['p1'].judgement).toBe(true); // Completed
		});
	});

	describe('Trial Victory', () => {
		it('should win with 3 completed trials', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withTrials = {
				...base,
				trials: {
					p1: { sun: true, moon: true, judgement: false },
					p2: {}
				}
			} as typeof base;
			
			// Not yet winner
			expect(checkVictory(withTrials)).toBeNull();
			
			// Complete third trial
			const allTrials = {
				...withTrials,
				trials: {
					p1: { sun: true, moon: true, judgement: true },
					p2: {}
				}
			};
			
			// Should win
			expect(checkVictory(allTrials)).toBe('p1');
		});

		it('should prioritize trial victory over score victory', () => {
			const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
			const withMixed = {
				...base,
				battlefield: {
					p1: { played: ['c1'] }, // Low score
					p2: { played: ['c1', 'c2', 'c3', 'c4'] } // High score
				},
				trials: {
					p1: { sun: true, moon: true, judgement: true }, // All trials
					p2: {}
				}
			} as typeof base;
			
			// p1 wins by trials despite lower score
			expect(checkVictory(withMixed)).toBe('p1');
		});
	});
});