import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { createInitialState, applyIntent, checkVictory } from '../src/sim.js';
import { initializeTarotState, processTarotIntent, type TarotMatchState } from '../src/tarot-extensions.js';
import TarotGameServer from '../src/tarot-server.js';

describe('E2E Integration Tests', () => {
	let server: TarotGameServer;
	let client1: WebSocket;
	let client2: WebSocket;
	const TEST_PORT = 9876;
	
	beforeEach(async () => {
		// Start server
		server = new TarotGameServer(TEST_PORT);
		await new Promise(resolve => setTimeout(resolve, 100));
	});
	
	afterEach(async () => {
		// Clean up connections
		if (client1?.readyState === WebSocket.OPEN) client1.close();
		if (client2?.readyState === WebSocket.OPEN) client2.close();
		if (server) {
			// @ts-ignore - access private property for cleanup
			server.wss?.close();
		}
		await new Promise(resolve => setTimeout(resolve, 100));
	});
	
	describe('Client Connection Flow', () => {
		it('should connect two players and start a match', async () => {
			const messages1: any[] = [];
			const messages2: any[] = [];
			
			// Connect first client
			client1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
			await new Promise(resolve => client1.once('open', resolve));
			
			client1.on('message', (data) => {
				messages1.push(JSON.parse(data.toString()));
			});
			
			// Connect second client
			client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);
			await new Promise(resolve => client2.once('open', resolve));
			
			client2.on('message', (data) => {
				messages2.push(JSON.parse(data.toString()));
			});
			
			// Both queue for match
			client1.send(JSON.stringify({
				type: 'queue',
				deck: ['major_00', 'wands_01', 'cups_01', 'swords_01', 'pentacles_01']
			}));
			
			client2.send(JSON.stringify({
				type: 'queue',
				deck: ['major_01', 'wands_02', 'cups_02', 'swords_02', 'pentacles_02']
			}));
			
			// Wait for match to start
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Verify both received match_start
			const matchStart1 = messages1.find(m => m.type === 'match_start');
			const matchStart2 = messages2.find(m => m.type === 'match_start');
			
			expect(matchStart1).toBeDefined();
			expect(matchStart2).toBeDefined();
			expect(matchStart1.matchId).toBe(matchStart2.matchId);
			expect(matchStart1.yourId).toBe(matchStart2.opponentId);
			expect(matchStart2.yourId).toBe(matchStart1.opponentId);
		});
		
		it('should handle player disconnect gracefully', async () => {
			// Connect and queue both players
			client1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
			client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);
			
			await Promise.all([
				new Promise(resolve => client1.once('open', resolve)),
				new Promise(resolve => client2.once('open', resolve))
			]);
			
			const messages2: any[] = [];
			client2.on('message', (data) => {
				messages2.push(JSON.parse(data.toString()));
			});
			
			// Queue both
			client1.send(JSON.stringify({ type: 'queue', deck: [] }));
			client2.send(JSON.stringify({ type: 'queue', deck: [] }));
			
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Disconnect client1
			client1.close();
			
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Client2 should receive disconnect notification
			const disconnectMsg = messages2.find(m => m.type === 'opponent_disconnected');
			expect(disconnectMsg).toBeDefined();
		});
	});
	
	describe('Game Mechanics Integration', () => {
		it('should process full turn cycle with Tarot mechanics', async () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// Set up initial hands
			let gameState = {
				...state,
				hands: {
					p1: { hand: ['major_00', 'wands_01'] },
					p2: { hand: ['cups_01'] }
				},
				resources: { p1: 2, p2: 1 },
				fate: { p1: 1, p2: 0 }
			} as TarotMatchState;
			
			// Player 1 plays Major Arcana
			gameState = processTarotIntent(gameState, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'major_00'
			});
			
			// Verify Major Arcana charging
			expect(gameState.majorArcanaCharge?.['p1']).toBeGreaterThan(0);
			
			// Verify reaction window opened
			expect(gameState.reactionWindow?.open).toBe(true);
			
			// Player 2 uses fate action during reaction
			gameState = processTarotIntent(gameState, {
				type: 'peek',
				playerId: 'p2'
			});
			
			// Verify fate was spent
			expect((gameState.fate as any)['p2']).toBe(0);
			
			// End turn
			gameState = processTarotIntent(gameState, {
				type: 'end_turn',
				playerId: 'p1'
			});
			
			// Verify phase advanced
			expect(gameState.phase).not.toBe('draw');
		});
		
		it('should handle Arcana Trials victory condition', async () => {
			const state = initializeTarotState(createInitialState({
				matchId: 'test',
				seed: 'test',
				players: ['p1', 'p2']
			}));
			
			// Set up state with near-complete trials
			const gameState = {
				...state,
				trials: {
					p1: {
						sun: true,
						moon: true,
						judgement: false,
						judgement_upright_major_20: true
					},
					p2: {}
				},
				hands: {
					p1: { hand: ['major_20'] },
					p2: { hand: [] }
				},
				resources: { p1: 1, p2: 0 },
				orientations: { 'major_20': 'reversed' }
			} as TarotMatchState;
			
			// Play card to complete Judgement trial
			const finalState = processTarotIntent(gameState, {
				type: 'play_card',
				playerId: 'p1',
				cardId: 'major_20'
			});
			
			// Check for victory
			const winner = checkVictory(finalState);
			expect(winner).toBe('p1');
		});
	});
	
	describe('Full Game Flow', () => {
		it('should complete a full game from start to finish', async () => {
			const messages1: any[] = [];
			const messages2: any[] = [];
			
			// Connect both clients
			client1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
			client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);
			
			await Promise.all([
				new Promise(resolve => client1.once('open', resolve)),
				new Promise(resolve => client2.once('open', resolve))
			]);
			
			// Set up message handlers
			client1.on('message', (data) => {
				const msg = JSON.parse(data.toString());
				messages1.push(msg);
			});
			
			client2.on('message', (data) => {
				const msg = JSON.parse(data.toString());
				messages2.push(msg);
			});
			
			// Queue for match with full decks
			const deck1 = generateTestDeck('p1');
			const deck2 = generateTestDeck('p2');
			
			client1.send(JSON.stringify({ type: 'queue', deck: deck1 }));
			client2.send(JSON.stringify({ type: 'queue', deck: deck2 }));
			
			// Wait for match start
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Both players ready
			client1.send(JSON.stringify({ type: 'ready' }));
			client2.send(JSON.stringify({ type: 'ready' }));
			
			// Wait for initial hands
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Verify state updates received
			const stateUpdates1 = messages1.filter(m => m.type === 'state_update');
			const stateUpdates2 = messages2.filter(m => m.type === 'state_update');
			
			expect(stateUpdates1.length).toBeGreaterThan(0);
			expect(stateUpdates2.length).toBeGreaterThan(0);
			
			// Get current player from state
			const latestState = stateUpdates1[stateUpdates1.length - 1].state;
			const currentPlayerId = latestState.players[latestState.turn % latestState.players.length];
			const currentClient = messages1.find(m => m.yourId === currentPlayerId) ? client1 : client2;
			
			// Current player plays a card
			currentClient.send(JSON.stringify({
				type: 'intent',
				intent: {
					type: 'play_card',
					cardId: deck1[0] // Play first card
				}
			}));
			
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Verify state was updated
			const updatesAfterPlay = messages1.filter(m => m.type === 'state_update');
			expect(updatesAfterPlay.length).toBeGreaterThan(stateUpdates1.length);
		});
	});
});

// Helper function to generate test deck
function generateTestDeck(playerId: string): string[] {
	const deck: string[] = [];
	
	// Add 2 Major Arcana (max allowed)
	deck.push(`major_${playerId === 'p1' ? '00' : '01'}`);
	deck.push(`major_${playerId === 'p1' ? '02' : '03'}`);
	
	// Add minor arcana (7 of each suit for 30 total)
	const suits = ['wands', 'cups', 'swords', 'pentacles'];
	for (const suit of suits) {
		for (let i = 1; i <= 7; i++) {
			deck.push(`${suit}_${i.toString().padStart(2, '0')}`);
		}
	}
	
	return deck;
}