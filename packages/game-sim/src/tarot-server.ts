/**
 * Tarot TCG WebSocket Server Adapter
 * Bridges the Godot client with the game-sim engine
 */

import { WebSocketServer } from 'ws';
import { createInitialState, applyIntent, checkVictory } from './sim.js';
import { initializeTarotState, processTarotIntent, type TarotMatchState, type TarotIntent } from './tarot-extensions.js';
import type { MatchState } from './types.js';

interface Player {
	id: string;
	ws: any;
	deck: string[];
	ready: boolean;
}

interface Match {
	id: string;
	state: TarotMatchState;
	players: Map<string, Player>;
	spectators: Set<any>;
}

export class TarotGameServer {
	private wss: WebSocketServer;
	private matches: Map<string, Match> = new Map();
	private playerQueue: Player[] = [];
	private nextMatchId = 1;
	private nextPlayerId = 1;
	
	constructor(port: number = 8765) {
		this.wss = new WebSocketServer({ port });
		this.setupWebSocketHandlers();
		console.log(`Tarot Game Server listening on port ${port}`);
	}
	
	private setupWebSocketHandlers() {
		this.wss.on('connection', (ws) => {
			const playerId = `player_${this.nextPlayerId++}`;
			console.log(`Player connected: ${playerId}`);
			
			ws.on('message', (data) => {
				try {
					const message = JSON.parse(data.toString());
					this.handleMessage(ws, playerId, message);
				} catch (error) {
					console.error('Invalid message:', error);
					ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
				}
			});
			
			ws.on('close', () => {
				console.log(`Player disconnected: ${playerId}`);
				this.handleDisconnect(playerId);
			});
			
			// Send welcome message
			ws.send(JSON.stringify({
				type: 'connected',
				playerId,
				serverVersion: '1.0.0'
			}));
		});
	}
	
	private handleMessage(ws: any, playerId: string, message: any) {
		switch (message.type) {
			case 'queue':
				this.handleQueue(ws, playerId, message);
				break;
				
			case 'ready':
				this.handleReady(playerId, message);
				break;
				
			case 'intent':
				this.handleIntent(playerId, message);
				break;
				
			case 'spectate':
				this.handleSpectate(ws, message.matchId);
				break;
				
			default:
				ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }));
		}
	}
	
	private handleQueue(ws: any, playerId: string, message: any) {
		const player: Player = {
			id: playerId,
			ws,
			deck: message.deck || [],
			ready: false
		};
		
		this.playerQueue.push(player);
		
		// Check if we can start a match
		if (this.playerQueue.length >= 2) {
			this.startMatch();
		} else {
			ws.send(JSON.stringify({
				type: 'queued',
				position: this.playerQueue.length,
				message: 'Waiting for opponent...'
			}));
		}
	}
	
	private startMatch() {
		const player1 = this.playerQueue.shift()!;
		const player2 = this.playerQueue.shift()!;
		
		const matchId = `match_${this.nextMatchId++}`;
		const seed = `seed_${Date.now()}`;
		
		// Create initial state
		const baseState = createInitialState({
			matchId,
			seed,
			players: [player1.id, player2.id]
		});
		
		// Initialize Tarot-specific state
		const tarotState = initializeTarotState(baseState);
		
		// Set up decks
		tarotState.decks = {
			[player1.id]: { draw: [...player1.deck], discard: [] },
			[player2.id]: { draw: [...player2.deck], discard: [] }
		};
		
		// Create match
		const match: Match = {
			id: matchId,
			state: tarotState,
			players: new Map([
				[player1.id, player1],
				[player2.id, player2]
			]),
			spectators: new Set()
		};
		
		this.matches.set(matchId, match);
		
		// Notify players
		const matchStartMessage = {
			type: 'match_start',
			matchId,
			state: this.sanitizeStateForPlayer(tarotState, player1.id),
			yourId: player1.id,
			opponentId: player2.id
		};
		
		player1.ws.send(JSON.stringify(matchStartMessage));
		
		player2.ws.send(JSON.stringify({
			...matchStartMessage,
			state: this.sanitizeStateForPlayer(tarotState, player2.id),
			yourId: player2.id,
			opponentId: player1.id
		}));
		
		console.log(`Match started: ${matchId} with players ${player1.id} vs ${player2.id}`);
	}
	
	private handleReady(playerId: string, message: any) {
		// Find match containing this player
		const match = this.findMatchByPlayer(playerId);
		if (!match) {
			console.error(`No match found for player ${playerId}`);
			return;
		}
		
		const player = match.players.get(playerId);
		if (player) {
			player.ready = true;
			
			// Check if both players are ready
			const allReady = Array.from(match.players.values()).every(p => p.ready);
			if (allReady) {
				this.startGameplay(match);
			}
		}
	}
	
	private startGameplay(match: Match) {
		// Draw initial hands
		const drawCount = 7;
		for (const [playerId, player] of match.players) {
			for (let i = 0; i < drawCount; i++) {
				match.state = applyIntent(match.state, {
					type: 'draw',
					playerId,
					cardId: '' // Will draw from deck
				}) as TarotMatchState;
			}
		}
		
		// Broadcast initial state
		this.broadcastState(match);
		
		// Start turn timer
		this.startTurnTimer(match);
	}
	
	private handleIntent(playerId: string, message: any) {
		const match = this.findMatchByPlayer(playerId);
		if (!match) {
			console.error(`No match found for player ${playerId}`);
			return;
		}
		
		// Validate it's the player's turn (or a fast action)
		const currentPlayer = match.state.players[match.state.turn % match.state.players.length];
		const isFastAction = ['flip_orientation', 'peek', 'force_draw', 'block_flip'].includes(message.intent.type);
		
		if (currentPlayer !== playerId && !isFastAction) {
			const player = match.players.get(playerId);
			if (player) {
				player.ws.send(JSON.stringify({
					type: 'error',
					message: 'Not your turn'
				}));
			}
			return;
		}
		
		// Apply intent
		const intent: TarotIntent = {
			...message.intent,
			playerId
		};
		
		try {
			match.state = processTarotIntent(match.state, intent);
			
			// Check for victory
			const winner = checkVictory(match.state);
			if (winner) {
				this.endMatch(match, winner);
			} else {
				// Broadcast updated state
				this.broadcastState(match);
			}
		} catch (error) {
			console.error('Error processing intent:', error);
			const player = match.players.get(playerId);
			if (player) {
				player.ws.send(JSON.stringify({
					type: 'error',
					message: 'Invalid action'
				}));
			}
		}
	}
	
	private handleSpectate(ws: any, matchId: string) {
		const match = this.matches.get(matchId);
		if (!match) {
			ws.send(JSON.stringify({
				type: 'error',
				message: 'Match not found'
			}));
			return;
		}
		
		match.spectators.add(ws);
		
		// Send current state
		ws.send(JSON.stringify({
			type: 'spectate_start',
			matchId,
			state: match.state
		}));
	}
	
	private handleDisconnect(playerId: string) {
		// Remove from queue
		this.playerQueue = this.playerQueue.filter(p => p.id !== playerId);
		
		// Check if in active match
		const match = this.findMatchByPlayer(playerId);
		if (match) {
			// Notify opponent
			for (const [id, player] of match.players) {
				if (id !== playerId) {
					player.ws.send(JSON.stringify({
						type: 'opponent_disconnected',
						message: 'Your opponent has disconnected'
					}));
				}
			}
			
			// End match with opponent as winner
			const opponent = Array.from(match.players.keys()).find(id => id !== playerId);
			if (opponent) {
				this.endMatch(match, opponent);
			}
		}
	}
	
	private broadcastState(match: Match) {
		// Send to players
		for (const [playerId, player] of match.players) {
			player.ws.send(JSON.stringify({
				type: 'state_update',
				state: this.sanitizeStateForPlayer(match.state, playerId)
			}));
		}
		
		// Send to spectators
		for (const spectator of match.spectators) {
			spectator.send(JSON.stringify({
				type: 'state_update',
				state: match.state
			}));
		}
	}
	
	private sanitizeStateForPlayer(state: TarotMatchState, playerId: string): any {
		// Hide opponent's hand and deck
		const sanitized = { ...state };
		
		// Hide other players' hands
		if (sanitized.hands) {
			const hands = { ...sanitized.hands as any };
			for (const id of state.players) {
				if (id !== playerId && hands[id]) {
					hands[id] = {
						hand: Array(hands[id].hand.length).fill('hidden')
					};
				}
			}
			sanitized.hands = hands;
		}
		
		// Hide deck contents (just show counts)
		if (sanitized.decks) {
			const decks = { ...sanitized.decks as any };
			for (const id of state.players) {
				if (decks[id]) {
					decks[id] = {
						draw: { count: decks[id].draw.length },
						discard: decks[id].discard // Discard is public
					};
				}
			}
			sanitized.decks = decks;
		}
		
		return sanitized;
	}
	
	private endMatch(match: Match, winner: string) {
		// Calculate rewards
		const rewards = {
			gold: 100,
			experience: 50,
			cards: [] as string[]
		};
		
		// Send results to players
		for (const [playerId, player] of match.players) {
			player.ws.send(JSON.stringify({
				type: 'match_end',
				winner,
				isWinner: playerId === winner,
				rewards: playerId === winner ? rewards : { gold: 25, experience: 10 },
				finalState: match.state
			}));
		}
		
		// Clean up
		this.matches.delete(match.id);
		console.log(`Match ended: ${match.id}, winner: ${winner}`);
	}
	
	private startTurnTimer(match: Match) {
		// Implement turn timer (e.g., 90 seconds per turn)
		// Auto-end turn if timer expires
		setTimeout(() => {
			if (this.matches.has(match.id)) {
				const currentPlayer = match.state.players[match.state.turn % match.state.players.length];
				this.handleIntent(currentPlayer, {
					intent: { type: 'end_turn' }
				});
			}
		}, 90000);
	}
	
	private findMatchByPlayer(playerId: string): Match | undefined {
		for (const match of this.matches.values()) {
			if (match.players.has(playerId)) {
				return match;
			}
		}
		return undefined;
	}
}

// Export for use as a module
export default TarotGameServer;

// If running directly, start server
if (import.meta.url === `file://${process.argv[1]}`) {
	const port = parseInt(process.env.PORT || '8765');
	new TarotGameServer(port);
}