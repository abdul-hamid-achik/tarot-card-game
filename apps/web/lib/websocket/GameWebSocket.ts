import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/lib/store/gameStore';

export type WebSocketMessage =
  | { type: 'join_match'; matchId: string; playerId: string }
  | { type: 'game_state'; state: any }
  | { type: 'play_card'; cardId: string; targetSlot?: number }
  | { type: 'end_turn' }
  | { type: 'flip_orientation'; cardId: string }
  | { type: 'peek'; targetPlayerId: string }
  | { type: 'force_draw' }
  | { type: 'error'; message: string }
  | { type: 'match_found'; matchId: string; players: string[] }
  | { type: 'opponent_disconnected' }
  | { type: 'game_over'; winner: string; reason: string };

class GameWebSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(url: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001') {
    if (this.socket?.connected) {
      console.log('Already connected');
      return;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    const store = useGameStore.getState();

    this.socket.on('connect', () => {
      console.log('Connected to game server');
      store.connect();
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      store.disconnect();
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('game_state', (data: any) => {
      console.log('Received game state:', data);
      // Map server state to client state
      // Server uses 'resources' for fate, client uses 'fate' field
      const mappedData = {
        ...data,
        players: Object.fromEntries(
          Object.entries(data.players || {}).map(([playerId, player]: [string, any]) => [
            playerId,
            {
              ...player,
              fate: data.resources?.[playerId] || 0,
              maxFate: 3 // Set max fate to 3 as per game design
            }
          ])
        )
      };
      store.setCurrentMatch(mappedData);
    });

    this.socket.on('match_found', (data: any) => {
      console.log('Match found:', data);
      store.setSearchingMatch(false);
      // Navigate to game board
      window.location.href = `/play/match/${data.matchId}`;
    });

    this.socket.on('card_played', (data: any) => {
      console.log('Card played:', data);
      // Update match state
      const currentMatch = store.currentMatch;
      if (currentMatch && data.newState) {
        // Map server state to client state for card play updates
        const mappedNewState = {
          ...data.newState,
          players: Object.fromEntries(
            Object.entries(data.newState.players || {}).map(([playerId, player]: [string, any]) => [
              playerId,
              {
                ...player,
                fate: data.newState.resources?.[playerId] || 0,
                maxFate: 3
              }
            ])
          )
        };
        store.updateMatchState(mappedNewState);
      }
    });

    this.socket.on('turn_ended', (data: any) => {
      console.log('Turn ended:', data);
      // Map server state to client state for turn updates
      const mappedNewState = data.newState ? {
        ...data.newState,
        players: Object.fromEntries(
          Object.entries(data.newState.players || {}).map(([playerId, player]: [string, any]) => [
            playerId,
            {
              ...player,
              fate: data.newState.resources?.[playerId] || 0,
              maxFate: 3
            }
          ])
        )
      } : data.newState;
      store.updateMatchState(mappedNewState);
    });

    this.socket.on('game_over', (data: any) => {
      console.log('Game over:', data);
      // Handle game over
      // Append minimal flags into lastAction if needed to avoid typing issues
      store.updateMatchState({
        lastAction: {
          type: 'game_over',
          playerId: data.winner,
          data: { reason: data.reason }
        }
      });
    });

    this.socket.on('opponent_disconnected', () => {
      console.log('Opponent disconnected');
      // Handle opponent disconnect
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after maximum attempts');
    });
  }

  joinMatch(matchId: string, playerId: string) {
    if (!this.socket?.connected) {
      console.error('Not connected to server');
      return;
    }

    this.send({ type: 'join_match', matchId, playerId });
  }

  playCard(cardId: string, targetSlot?: number) {
    if (!this.socket?.connected) {
      console.error('Not connected to server');
      return;
    }

    this.send({ type: 'play_card', cardId, targetSlot });
  }

  endTurn() {
    if (!this.socket?.connected) {
      console.error('Not connected to server');
      return;
    }

    this.send({ type: 'end_turn' });
  }

  flipOrientation(cardId: string) {
    if (!this.socket?.connected) {
      console.error('Not connected to server');
      return;
    }

    this.send({ type: 'flip_orientation', cardId });
  }

  peek(targetPlayerId: string) {
    if (!this.socket?.connected) {
      console.error('Not connected to server');
      return;
    }

    this.send({ type: 'peek', targetPlayerId });
  }

  forceDraw() {
    if (!this.socket?.connected) {
      console.error('Not connected to server');
      return;
    }

    this.send({ type: 'force_draw' });
  }

  private send(message: WebSocketMessage) {
    if (!this.socket) {
      console.error('WebSocket not initialized');
      return;
    }

    this.socket.emit(message.type, message);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const gameWebSocket = new GameWebSocket();