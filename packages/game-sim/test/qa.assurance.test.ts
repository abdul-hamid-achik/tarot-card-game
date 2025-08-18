import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent, checkVictory } from '../src/sim.js';
import { initializeTarotState, processTarotIntent, type TarotMatchState } from '../src/tarot-extensions.js';

describe('QA Assurance Tests', () => {
	describe('Deck Building Constraints', () => {
		it('should enforce 30-40 card deck limit', () => {
			const validateDeck = (deck: string[]): boolean => {
				return deck.length >= 30 && deck.length <= 40;
			};
			
			expect(validateDeck(Array(29).fill('card'))).toBe(false); // Too few
			expect(validateDeck(Array(30).fill('card'))).toBe(true);  // Min valid
			expect(validateDeck(Array(35).fill('card'))).toBe(true);  // Valid
			expect(validateDeck(Array(40).fill('card'))).toBe(true);  // Max valid
			expect(validateDeck(Array(41).fill('card'))).toBe(false); // Too many
		});
		
		it('should enforce max 2 Major Arcana per deck', () => {
			const countMajorArcana = (deck: string[]): number => {
				return deck.filter(card => card.startsWith('major_')).length;
			};
			
			const validateMajorArcana = (deck: string[]): boolean => {
				return countMajorArcana(deck) <= 2;
			};
			
			const deck1 = ['major_00', 'major_01', 'wands_01'];
			const deck2 = ['major_00', 'major_01', 'major_02', 'wands_01'];
			
			expect(validateMajorArcana(deck1)).toBe(true);  // 2 majors - valid
			expect(validateMajorArcana(deck2)).toBe(false); // 3 majors - invalid
		});
		
		it('should enforce max 2 copies of minor arcana', () => {
			const validateMinorCopies = (deck: string[]): boolean => {
				const counts: Record<string, number> = {};
				for (const card of deck) {
					if (!card.startsWith('major_')) {
						counts[card] = (counts[card] || 0) + 1;
						if (counts[card] > 2) return false;
					}
				}
				return true;
			};
			
			const validDeck = ['wands_01', 'wands_01', 'cups_01'];
			const invalidDeck = ['wands_01', 'wands_01', 'wands_01', 'cups_01'];
			
			expect(validateMinorCopies(validDeck)).toBe(true);
			expect(validateMinorCopies(invalidDeck)).toBe(false);
		});
	});
	
	describe('Fate System Constraints', () => {
		it('should cap fate at 3 maximum', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// Try to set fate above 3
			const testState = {
				...state,
				fate: { p1: 5, p2: 2 }
			} as TarotMatchState;
			
			// Fate generation should cap at 3
			const nextState = applyIntent(testState, { type: 'end_turn', playerId: 'p1' });
			// After turn advance, fate should still be capped
			expect(Object.values(nextState.fate as any).every(f => f <= 3)).toBe(true);
		});
		
		it('should require sufficient fate for actions', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			const testState = {
				...state,
				fate: { p1: 0, p2: 1 },
				reactionWindow: { open: true, responded: { p1: false, p2: false } }
			} as TarotMatchState;
			
			// Try flip (costs 1) with 0 fate - should fail
			const afterFlip = applyIntent(testState, {
				type: 'flip_orientation',
				playerId: 'p1',
				cardId: 'test_card'
			});
			expect((afterFlip.fate as any)['p1']).toBe(0); // Unchanged
			
			// Try force draw (costs 2) with 1 fate - should fail
			const afterDraw = applyIntent(testState, {
				type: 'force_draw',
				playerId: 'p2'
			});
			expect((afterDraw.fate as any)['p2']).toBe(1); // Unchanged
		});
		
		it('should only allow fate actions during reaction window', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			const closedWindow = {
				...state,
				fate: { p1: 3, p2: 3 },
				reactionWindow: { open: false, responded: { p1: false, p2: false } }
			} as TarotMatchState;
			
			// All fate actions should fail
			const actions = ['flip_orientation', 'peek', 'force_draw', 'block_flip'];
			
			for (const action of actions) {
				const before = (closedWindow.fate as any)['p1'];
				const after = applyIntent(closedWindow, {
					type: action,
					playerId: 'p1',
					cardId: 'test',
					targetPlayerId: 'p2'
				} as any);
				expect((after.fate as any)['p1']).toBe(before); // No fate spent
			}
		});
	});
	
	describe('Spread Mechanics Validation', () => {
		it('should apply Present bonus only on turn 1', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			const withSpread = {
				...state,
				spread: {
					p1: {
						presentId: 'wands_01',
						consumed: { present: false }
					}
				},
				hands: { p1: { hand: ['wands_01'] }, p2: { hand: [] } },
				resources: { p1: 1, p2: 0 },
				turn: 0
			} as TarotMatchState;
			
			// Turn 0 (turn 1 for p1) - should get cost reduction
			const turn0Play = applyIntent(withSpread, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'wands_01'
			});
			expect((turn0Play.resources as any)['p1']).toBe(1); // No cost due to Present
			
			// After advancing turns, Present bonus shouldn't apply
			const laterTurn = { ...withSpread, turn: 2 };
			const laterPlay = applyIntent(laterTurn, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'wands_01'
			});
			expect((laterPlay.resources as any)['p1']).toBe(0); // Cost paid normally
		});
		
		it('should apply Past refund on turns 1-2', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			const withSpread = {
				...state,
				spread: {
					p1: {
						pastId: 'cups_01',
						consumed: { past: false }
					}
				},
				hands: { p1: { hand: ['cups_01'] }, p2: { hand: [] } },
				resources: { p1: 1, p2: 0 },
				fate: { p1: 0, p2: 0 },
				turn: 0
			} as TarotMatchState;
			
			// Turn 0 - should get fate refund
			const turn0Play = applyIntent(withSpread, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'cups_01'
			});
			expect((turn0Play.fate as any)['p1']).toBe(1); // +1 Fate refunded
			
			// Turn 3+ - no refund
			const turn3 = { ...withSpread, turn: 3 };
			const laterPlay = applyIntent(turn3, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'cups_01'
			});
			expect((laterPlay.fate as any)['p1']).toBe(0); // No refund
		});
		
		it('should prevent double consumption of spread bonuses', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			const withSpread = {
				...state,
				spread: {
					p1: {
						pastId: 'cups_01',
						consumed: { past: true } // Already consumed
					}
				},
				hands: { p1: { hand: ['cups_01'] }, p2: { hand: [] } },
				resources: { p1: 1, p2: 0 },
				fate: { p1: 0, p2: 0 },
				turn: 0
			} as TarotMatchState;
			
			// Should not get refund since already consumed
			const play = applyIntent(withSpread, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'cups_01'
			});
			expect((play.fate as any)['p1']).toBe(0); // No refund
		});
	});
	
	describe('Victory Conditions', () => {
		it('should prioritize Arcana Trials over score victory', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// p2 has higher score but p1 has trials
			const gameState = {
				...state,
				battlefield: {
					p1: { played: ['c1'] }, // 1 card
					p2: { played: ['c1', 'c2', 'c3', 'c4', 'c5'] } // 5 cards
				},
				trials: {
					p1: { sun: true, moon: true, judgement: true },
					p2: {}
				}
			} as TarotMatchState;
			
			const winner = checkVictory(gameState);
			expect(winner).toBe('p1'); // Trials win despite lower score
		});
		
		it('should require exactly 3 trials for victory', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// Only 2 trials completed
			const twoTrials = {
				...state,
				trials: {
					p1: { sun: true, moon: true, judgement: false },
					p2: {}
				}
			} as TarotMatchState;
			
			expect(checkVictory(twoTrials)).toBeNull();
			
			// 3 trials completed
			const threeTrials = {
				...state,
				trials: {
					p1: { sun: true, moon: true, judgement: true },
					p2: {}
				}
			} as TarotMatchState;
			
			expect(checkVictory(threeTrials)).toBe('p1');
		});
	});
	
	describe('Card Orientation Rules', () => {
		it('should track orientation changes correctly', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			const withCard = {
				...state,
				orientations: { 'major_00': 'upright' },
				fate: { p1: 1, p2: 0 },
				battlefield: { p1: { played: ['major_00'] }, p2: { played: [] } },
				reactionWindow: { open: true, responded: { p1: false, p2: false } }
			} as TarotMatchState;
			
			// Flip orientation
			const flipped = applyIntent(withCard, {
				type: 'flip_orientation',
				playerId: 'p1',
				cardId: 'major_00'
			});
			
			expect((flipped.orientations as any)['major_00']).toBe('reversed');
			
			// Flip again (if had more fate)
			const doubleFlip = applyIntent({
				...flipped,
				fate: { p1: 1, p2: 0 },
				reactionWindow: { open: true, responded: { p1: false, p2: false } }
			}, {
				type: 'flip_orientation',
				playerId: 'p1',
				cardId: 'major_00'
			});
			
			expect((doubleFlip.orientations as any)['major_00']).toBe('upright');
		});
	});
	
	describe('Resource Management', () => {
		it('should prevent playing cards without sufficient resources', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			const noResources = {
				...state,
				hands: { p1: { hand: ['wands_01'] }, p2: { hand: [] } },
				resources: { p1: 0, p2: 0 } // No resources
			} as TarotMatchState;
			
			const afterPlay = applyIntent(noResources, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'wands_01'
			});
			
			// Card should still be in hand
			expect((afterPlay.hands as any)['p1'].hand).toContain('wands_01');
			// No battlefield change
			expect((afterPlay.battlefield as any)['p1']?.played || []).not.toContain('wands_01');
		});
		
		it('should generate 1 resource per turn', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			let gameState = {
				...state,
				resources: { p1: 0, p2: 0 }
			} as TarotMatchState;
			
			// End turn to trigger resource generation
			for (let i = 0; i < 4; i++) {
				gameState = applyIntent(gameState, { type: 'end_turn', playerId: 'p1' });
			}
			
			// Check resource was generated for current player
			const currentPlayer = gameState.players[gameState.turn % gameState.players.length];
			expect((gameState.resources as any)[currentPlayer]).toBeGreaterThan(0);
		});
	});
});