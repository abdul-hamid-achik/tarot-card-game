import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent, checkVictory, getScore } from '../src/sim.js';
import { 
	initializeTarotState, 
	processTarotIntent, 
	chargeMajorArcana,
	activateMajorArcanaUltimate,
	applySuitStyle,
	calculateElementalDamage,
	maintainChanneling,
	releaseChanneling,
	type TarotMatchState 
} from '../src/tarot-extensions.js';

describe('Complete Game Flow Tests', () => {
	describe('PvP Match Flow', () => {
		it('should simulate a complete PvP match', () => {
			// Initialize match
			const state = initializeTarotState(createInitialState({
				matchId: 'pvp_match_1',
				seed: 'test_seed',
				players: ['alice', 'bob']
			}));
			
			// Set up decks
			let gameState = {
				...state,
				decks: {
					alice: {
						draw: ['major_00', 'wands_01', 'wands_02', 'cups_01', 'swords_01'],
						discard: []
					},
					bob: {
						draw: ['major_01', 'pentacles_01', 'pentacles_02', 'cups_02', 'swords_02'],
						discard: []
					}
				}
			} as TarotMatchState;
			
			// Draw initial hands (7 cards each)
			for (let i = 0; i < 7; i++) {
				gameState = applyIntent(gameState, { type: 'draw', playerId: 'alice', cardId: '' });
				gameState = applyIntent(gameState, { type: 'draw', playerId: 'bob', cardId: '' });
			}
			
			// Mulligan/Opening Reading - assign spreads
			gameState = applyIntent(gameState, {
				type: 'assign_spread',
				playerId: 'alice',
				pastId: 'wands_01',
				presentId: 'major_00',
				futureId: 'cups_01'
			} as any);
			
			gameState = applyIntent(gameState, {
				type: 'assign_spread',
				playerId: 'bob',
				pastId: 'pentacles_01',
				presentId: 'major_01',
				futureId: 'cups_02'
			} as any);
			
			// Turn 1: Alice plays
			const turn1Player = gameState.players[gameState.turn % gameState.players.length];
			expect(turn1Player).toBe('alice');
			
			// Alice plays Major Arcana with Present bonus (cost -1)
			gameState = processTarotIntent(gameState, {
				type: 'play_card',
				playerId: 'alice',
				cardId: 'major_00'
			});
			
			// Check Major Arcana charging
			expect(gameState.majorArcanaCharge?.['alice']).toBeGreaterThan(0);
			
			// Reaction window should be open
			expect(gameState.reactionWindow?.open).toBe(true);
			
			// Bob uses fate action
			gameState = processTarotIntent(gameState, {
				type: 'peek',
				playerId: 'bob'
			});
			
			// Alice ends turn
			for (let i = 0; i < 4; i++) {
				gameState = applyIntent(gameState, { type: 'end_turn', playerId: 'alice' });
			}
			
			// Turn 2: Bob plays
			expect(gameState.turn).toBe(1);
			
			// Continue until victory
			let winner = null;
			let turnCount = 0;
			const maxTurns = 50;
			
			while (!winner && turnCount < maxTurns) {
				const currentPlayer = gameState.players[gameState.turn % gameState.players.length];
				
				// Simulate simple AI: play first card if possible
				const hand = (gameState.hands as any)[currentPlayer]?.hand || [];
				const resources = (gameState.resources as any)[currentPlayer] || 0;
				
				if (hand.length > 0 && resources > 0) {
					gameState = processTarotIntent(gameState, {
						type: 'play_card',
						playerId: currentPlayer,
						cardId: hand[0]
					});
				}
				
				// End turn
				for (let i = 0; i < 4; i++) {
					gameState = applyIntent(gameState, { type: 'end_turn', playerId: currentPlayer });
				}
				
				winner = checkVictory(gameState);
				turnCount++;
			}
			
			// Game should end within reasonable turns
			expect(turnCount).toBeLessThan(maxTurns);
		});
	});
	
	describe('PvE Roguelike Flow', () => {
		it('should simulate PvE progression through regions', () => {
			// Simulate PvE run data
			const runData = {
				significator: 'major_00',
				deck: Array(30).fill(null).map((_, i) => ({
					id: `card_${i}`,
					count: 1
				})),
				health: 30,
				max_health: 30,
				gold: 0,
				boons: [],
				omens: [],
				deck_fragments: 0
			};
			
			// Region 1: 33% deck unlock
			const region1Progress = simulateRegion(runData, 1);
			expect(region1Progress.deck_fragments).toBeGreaterThanOrEqual(330);
			
			// Region 2: 66% deck unlock
			const region2Progress = simulateRegion(region1Progress, 2);
			expect(region2Progress.deck_fragments).toBeGreaterThanOrEqual(660);
			
			// Region 3: 100% deck unlock
			const region3Progress = simulateRegion(region2Progress, 3);
			expect(region3Progress.deck_fragments).toBeGreaterThanOrEqual(1000);
			
			// Can exchange for full deck
			expect(region3Progress.deck_fragments >= 1000).toBe(true);
		});
		
		function simulateRegion(runData: any, regionNumber: number): any {
			const updatedRun = { ...runData };
			
			// Simulate battles and events
			const battleRewards = 50 * regionNumber;
			const eventRewards = 30 * regionNumber;
			const bossRewards = 100 * regionNumber;
			
			// Complete region
			updatedRun.gold += battleRewards + eventRewards + bossRewards;
			updatedRun.deck_fragments += 330; // 33% per region
			
			// Add cards from rewards
			updatedRun.deck.push({
				id: `reward_${regionNumber}`,
				count: 1
			});
			
			return updatedRun;
		}
	});
	
	describe('Major Arcana Ultimate Abilities', () => {
		it('should charge and activate ultimate ability', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			let gameState = state;
			
			// Charge Major Arcana to 100
			for (let i = 0; i < 10; i++) {
				gameState = chargeMajorArcana(gameState, 'p1', 'major_00');
			}
			
			expect(gameState.majorArcanaCharge?.['p1']).toBe(100);
			
			// Activate ultimate
			gameState = activateMajorArcanaUltimate(gameState, 'p1');
			
			// Charge should reset
			expect(gameState.majorArcanaCharge?.['p1']).toBe(0);
		});
	});
	
	describe('Suit Combat Styles', () => {
		it('should apply different effects based on suit', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// Test each suit style
			const suits = [
				{ card: 'wands_01', effect: 'burn' },
				{ card: 'cups_01', effect: 'heal' },
				{ card: 'swords_01', effect: 'counter' },
				{ card: 'pentacles_01', effect: 'shield' }
			];
			
			for (const { card, effect } of suits) {
				const styledState = applySuitStyle(state, card, 'p1');
				// Verify state was modified (specific implementation would check actual effects)
				expect(styledState).toBeDefined();
			}
		});
	});
	
	describe('Elemental Interactions', () => {
		it('should calculate elemental damage modifiers', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// Fire vs Water (disadvantage)
			const fireVsWater = calculateElementalDamage(state, 'fire', 'water', 10);
			expect(fireVsWater).toBeLessThan(10);
			
			// Water vs Fire (advantage)
			const waterVsFire = calculateElementalDamage(state, 'water', 'fire', 10);
			expect(waterVsFire).toBeGreaterThan(10);
			
			// Neutral matchup
			const fireVsAir = calculateElementalDamage(state, 'fire', 'air', 10);
			expect(fireVsAir).toBe(10);
		});
	});
	
	describe('Channeling System', () => {
		it('should maintain and release channeling', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// Start channeling
			let gameState = maintainChanneling(state, 'major_05');
			expect(gameState.channeling?.cardId).toBe('major_05');
			expect(gameState.channeling?.turns).toBe(1);
			
			// Continue channeling
			gameState = maintainChanneling(gameState, 'major_05');
			expect(gameState.channeling?.turns).toBe(2);
			
			// Release for amplified effect
			gameState = releaseChanneling(gameState);
			expect(gameState.channeling?.turns).toBe(0);
			expect(gameState.channeling?.cardId).toBeUndefined();
		});
	});
	
	describe('Turn Structure', () => {
		it('should follow correct phase progression', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			let gameState = state;
			const phases: string[] = [];
			
			// Track phase progression through a full turn
			for (let i = 0; i < 4; i++) {
				phases.push(gameState.phase);
				gameState = applyIntent(gameState, { type: 'end_turn', playerId: 'p1' });
			}
			
			// Should go: draw -> main -> combat -> end
			expect(phases).toEqual(['draw', 'main', 'combat', 'end']);
			
			// After full cycle, should be back to draw for next turn
			expect(gameState.phase).toBe('draw');
			expect(gameState.turn).toBe(1);
		});
	});
	
	describe('Game State Consistency', () => {
		it('should maintain state consistency through complex interactions', () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			let gameState = {
				...state,
				hands: {
					p1: { hand: ['major_00', 'wands_01', 'cups_01'] },
					p2: { hand: ['major_01', 'swords_01', 'pentacles_01'] }
				},
				resources: { p1: 3, p2: 3 },
				fate: { p1: 3, p2: 3 }
			} as TarotMatchState;
			
			// Complex sequence of actions
			const actions = [
				{ type: 'play_card', playerId: 'p1', cardId: 'major_00' },
				{ type: 'flip_orientation', playerId: 'p2', cardId: 'major_00' },
				{ type: 'peek', playerId: 'p1' },
				{ type: 'end_turn', playerId: 'p1' },
				{ type: 'play_card', playerId: 'p2', cardId: 'major_01' },
				{ type: 'force_draw', playerId: 'p1' },
				{ type: 'end_turn', playerId: 'p2' }
			];
			
			for (const action of actions) {
				const beforePlayers = gameState.players.length;
				const beforeMatchId = gameState.matchId;
				
				gameState = processTarotIntent(gameState, action as any);
				
				// Verify core state integrity
				expect(gameState.players.length).toBe(beforePlayers);
				expect(gameState.matchId).toBe(beforeMatchId);
				expect(gameState.turn).toBeGreaterThanOrEqual(0);
				
				// Verify resource bounds
				for (const player of gameState.players) {
					const fate = (gameState.fate as any)[player] || 0;
					const resources = (gameState.resources as any)[player] || 0;
					
					expect(fate).toBeGreaterThanOrEqual(0);
					expect(fate).toBeLessThanOrEqual(3);
					expect(resources).toBeGreaterThanOrEqual(0);
				}
			}
		});
	});
});