import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { TarotServer } from '../src/tarot-server';
import { WebSocketClient } from '../src/ws-client';

describe('WebSocket Server Tests', () => {
  let server: TarotServer;
  let client1: WebSocketClient;
  let client2: WebSocketClient;
  const TEST_PORT = 8081;

  beforeEach(async () => {
    server = new TarotServer(TEST_PORT);
    await server.start();
    
    client1 = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
    client2 = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
    
    await client1.connect();
    await client2.connect();
  });

  afterEach(async () => {
    await client1.disconnect();
    await client2.disconnect();
    await server.stop();
  });

  describe('Connection Management', () => {
    it('should accept multiple client connections', async () => {
      expect(client1.isConnected()).toBe(true);
      expect(client2.isConnected()).toBe(true);
      expect(server.getClientCount()).toBe(2);
    });

    it('should handle client disconnection gracefully', async () => {
      await client1.disconnect();
      
      // Wait for server to process disconnection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(server.getClientCount()).toBe(1);
      expect(client2.isConnected()).toBe(true);
    });

    it('should reject connections when server is full', async () => {
      // Fill up server to max capacity
      const extraClients = [];
      for (let i = 0; i < 98; i++) { // 2 already connected + 98 = 100 max
        const client = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
        await client.connect();
        extraClients.push(client);
      }
      
      // Try to connect one more
      const overflowClient = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
      const connectPromise = overflowClient.connect();
      
      await expect(connectPromise).rejects.toThrow('Server full');
      
      // Cleanup
      for (const client of extraClients) {
        await client.disconnect();
      }
    });

    it('should handle reconnection', async () => {
      const playerId = 'test_player_1';
      
      // Initial connection with auth
      await client1.send({ type: 'auth', playerId });
      
      // Disconnect
      await client1.disconnect();
      
      // Reconnect
      await client1.connect();
      await client1.send({ type: 'auth', playerId });
      
      const response = await client1.waitForMessage('auth_success');
      expect(response.playerId).toBe(playerId);
    });
  });

  describe('Matchmaking', () => {
    it('should queue players for matches', async () => {
      const deck1 = generateTestDeck();
      const deck2 = generateTestDeck();
      
      // Both players queue
      await client1.send({ type: 'queue', deck: deck1 });
      await client2.send({ type: 'queue', deck: deck2 });
      
      // Should receive match found
      const match1 = await client1.waitForMessage('match_found');
      const match2 = await client2.waitForMessage('match_found');
      
      expect(match1.matchId).toBe(match2.matchId);
      expect(match1.opponent).toBeTruthy();
      expect(match2.opponent).toBeTruthy();
    });

    it('should handle queue cancellation', async () => {
      await client1.send({ type: 'queue', deck: generateTestDeck() });
      await client1.send({ type: 'cancel_queue' });
      
      const response = await client1.waitForMessage('queue_cancelled');
      expect(response.success).toBe(true);
    });

    it('should not match same player twice', async () => {
      const deck = generateTestDeck();
      
      await client1.send({ type: 'queue', deck });
      
      // Try to queue again
      await client1.send({ type: 'queue', deck });
      
      const error = await client1.waitForMessage('error');
      expect(error.message).toContain('already in queue');
    });

    it('should match players with similar MMR', async () => {
      // Set up players with different MMR
      await client1.send({ type: 'auth', playerId: 'high_mmr', mmr: 2000 });
      await client2.send({ type: 'auth', playerId: 'low_mmr', mmr: 1000 });
      
      const client3 = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
      await client3.connect();
      await client3.send({ type: 'auth', playerId: 'mid_mmr', mmr: 1950 });
      
      // Queue all players
      await client1.send({ type: 'queue', deck: generateTestDeck() });
      await client2.send({ type: 'queue', deck: generateTestDeck() });
      await client3.send({ type: 'queue', deck: generateTestDeck() });
      
      // High MMR should match with mid MMR, not low MMR
      const match1 = await client1.waitForMessage('match_found');
      const match3 = await client3.waitForMessage('match_found');
      
      expect(match1.matchId).toBe(match3.matchId);
      
      await client3.disconnect();
    });
  });

  describe('Game Actions', () => {
    let matchId: string;
    
    beforeEach(async () => {
      // Set up a match
      await client1.send({ type: 'queue', deck: generateTestDeck() });
      await client2.send({ type: 'queue', deck: generateTestDeck() });
      
      const match = await client1.waitForMessage('match_found');
      matchId = match.matchId;
      
      // Both players ready
      await client1.send({ type: 'ready', matchId });
      await client2.send({ type: 'ready', matchId });
    });

    it('should handle card plays', async () => {
      await client1.send({
        type: 'intent',
        matchId,
        intent: {
          type: 'play_card',
          cardId: 'wands_01',
          laneIndex: 0
        }
      });
      
      const state1 = await client1.waitForMessage('state_update');
      const state2 = await client2.waitForMessage('state_update');
      
      expect(state1.state).toEqual(state2.state);
      expect(state1.state.players.player1.lanes[0]).toBeTruthy();
    });

    it('should handle fate actions during reaction window', async () => {
      // Trigger reaction window
      await client1.send({
        type: 'intent',
        matchId,
        intent: {
          type: 'play_card',
          cardId: 'major_00',
          laneIndex: 0
        }
      });
      
      // Wait for reaction window
      const reaction = await client2.waitForMessage('reaction_window');
      expect(reaction.open).toBe(true);
      
      // Use fate action
      await client2.send({
        type: 'intent',
        matchId,
        intent: {
          type: 'flip_orientation',
          cardId: 'major_00'
        }
      });
      
      const state = await client2.waitForMessage('state_update');
      expect(state.state.cardOrientations['major_00']).toBe('reversed');
    });

    it('should handle turn endings', async () => {
      const initialState = await client1.waitForMessage('state_update');
      const initialTurn = initialState.state.turn;
      
      await client1.send({
        type: 'intent',
        matchId,
        intent: { type: 'end_turn' }
      });
      
      const newState = await client1.waitForMessage('state_update');
      expect(newState.state.turn).toBe(initialTurn + 1);
      expect(newState.state.currentPlayer).not.toBe(initialState.state.currentPlayer);
    });

    it('should handle victory conditions', async () => {
      // Set up near-victory state
      await server.updateMatchState(matchId, state => ({
        ...state,
        players: {
          ...state.players,
          player2: {
            ...state.players.player2,
            health: 1
          }
        }
      }));
      
      // Deal final damage
      await client1.send({
        type: 'intent',
        matchId,
        intent: {
          type: 'play_card',
          cardId: 'wands_01',
          laneIndex: 0
        }
      });
      
      const victory1 = await client1.waitForMessage('match_end');
      const victory2 = await client2.waitForMessage('match_end');
      
      expect(victory1.winner).toBe('player1');
      expect(victory2.winner).toBe('player1');
      expect(victory1.reason).toBe('health');
    });

    it('should handle concession', async () => {
      await client1.send({
        type: 'concede',
        matchId
      });
      
      const end1 = await client1.waitForMessage('match_end');
      const end2 = await client2.waitForMessage('match_end');
      
      expect(end1.winner).toBe('player2');
      expect(end2.winner).toBe('player2');
      expect(end1.reason).toBe('concession');
    });
  });

  describe('Spectator Mode', () => {
    it('should allow spectating ongoing matches', async () => {
      // Set up a match
      await client1.send({ type: 'queue', deck: generateTestDeck() });
      await client2.send({ type: 'queue', deck: generateTestDeck() });
      
      const match = await client1.waitForMessage('match_found');
      const matchId = match.matchId;
      
      // Third client spectates
      const spectator = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
      await spectator.connect();
      await spectator.send({ type: 'spectate', matchId });
      
      const spectatorState = await spectator.waitForMessage('spectator_joined');
      expect(spectatorState.matchId).toBe(matchId);
      expect(spectatorState.state).toBeTruthy();
      
      // Spectator should receive updates
      await client1.send({
        type: 'intent',
        matchId,
        intent: { type: 'end_turn' }
      });
      
      const update = await spectator.waitForMessage('state_update');
      expect(update.state).toBeTruthy();
      
      await spectator.disconnect();
    });

    it('should not allow spectators to send game actions', async () => {
      // Set up match and spectator
      await client1.send({ type: 'queue', deck: generateTestDeck() });
      await client2.send({ type: 'queue', deck: generateTestDeck() });
      
      const match = await client1.waitForMessage('match_found');
      const matchId = match.matchId;
      
      const spectator = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
      await spectator.connect();
      await spectator.send({ type: 'spectate', matchId });
      
      // Try to send game action
      await spectator.send({
        type: 'intent',
        matchId,
        intent: { type: 'end_turn' }
      });
      
      const error = await spectator.waitForMessage('error');
      expect(error.message).toContain('spectators cannot');
      
      await spectator.disconnect();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages', async () => {
      await client1.send({ type: 'invalid_type' });
      
      const error = await client1.waitForMessage('error');
      expect(error.message).toContain('Unknown message type');
    });

    it('should handle invalid game actions', async () => {
      // Try to play without being in a match
      await client1.send({
        type: 'intent',
        matchId: 'fake_match',
        intent: { type: 'play_card', cardId: 'wands_01' }
      });
      
      const error = await client1.waitForMessage('error');
      expect(error.message).toContain('Match not found');
    });

    it('should handle timeout in matches', async () => {
      // Set up match
      await client1.send({ type: 'queue', deck: generateTestDeck() });
      await client2.send({ type: 'queue', deck: generateTestDeck() });
      
      const match = await client1.waitForMessage('match_found');
      const matchId = match.matchId;
      
      // Simulate timeout by not sending actions
      vi.useFakeTimers();
      vi.advanceTimersByTime(120000); // 2 minute timeout
      
      const timeout = await client1.waitForMessage('match_end');
      expect(timeout.reason).toBe('timeout');
      
      vi.useRealTimers();
    });
  });

  describe('Performance', () => {
    it('should handle rapid message sending', async () => {
      const messageCount = 100;
      const promises = [];
      
      for (let i = 0; i < messageCount; i++) {
        promises.push(client1.send({ type: 'ping', id: i }));
      }
      
      await Promise.all(promises);
      
      let pongCount = 0;
      client1.on('pong', () => pongCount++);
      
      // Wait for all pongs
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(pongCount).toBe(messageCount);
    });

    it('should handle concurrent matches', async () => {
      const matchPromises = [];
      const clients: WebSocketClient[] = [];
      
      // Create 10 concurrent matches (20 clients)
      for (let i = 0; i < 20; i++) {
        const client = new WebSocketClient(`ws://localhost:${TEST_PORT}`);
        await client.connect();
        clients.push(client);
        
        matchPromises.push(
          client.send({ type: 'queue', deck: generateTestDeck() })
        );
      }
      
      await Promise.all(matchPromises);
      
      // All should be matched
      const matchIds = new Set();
      for (const client of clients) {
        const match = await client.waitForMessage('match_found');
        matchIds.add(match.matchId);
      }
      
      expect(matchIds.size).toBe(10); // 10 unique matches
      
      // Cleanup
      for (const client of clients) {
        await client.disconnect();
      }
    });
  });
});

// Helper functions
function generateTestDeck(): string[] {
  return [
    'major_00', 'major_01',
    ...Array.from({ length: 7 }, (_, i) => `wands_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 7 }, (_, i) => `cups_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 7 }, (_, i) => `swords_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 7 }, (_, i) => `pentacles_${String(i + 1).padStart(2, '0')}`)
  ];
}

// Mock WebSocket Client class
class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private messageQueue: any[] = [];

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => resolve());
      this.ws.on('error', (err) => reject(err));
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.messageQueue.push(message);
        
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
          handler(message);
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws) {
        resolve();
        return;
      }
      
      this.ws.on('close', () => resolve());
      this.ws.close();
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async send(data: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    this.ws.send(JSON.stringify(data));
  }

  async waitForMessage(type: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${type}`));
      }, timeout);
      
      // Check existing queue
      const existing = this.messageQueue.find(m => m.type === type);
      if (existing) {
        clearTimeout(timeoutId);
        this.messageQueue = this.messageQueue.filter(m => m !== existing);
        resolve(existing);
        return;
      }
      
      // Wait for new message
      this.messageHandlers.set(type, (data) => {
        clearTimeout(timeoutId);
        this.messageHandlers.delete(type);
        resolve(data);
      });
    });
  }

  on(event: string, handler: (data: any) => void): void {
    this.messageHandlers.set(event, handler);
  }
}