import { NextRequest, NextResponse } from 'next/server';
import { createTarotAI } from '@tarot/game-sim/src/tarot-ai';

// Queue management
interface QueueEntry {
  playerId: string;
  deck: string[];
  timestamp: number;
  preferAI?: boolean;
}

const matchQueue: Map<string, QueueEntry> = new Map();
const activeMatches: Map<string, any> = new Map();
const QUEUE_TIMEOUT_MS = 15000; // 15 seconds
const AI_SUGGEST_MS = 10000; // Suggest AI after 10 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, deck, action = 'queue' } = body;

    if (action === 'cancel') {
      matchQueue.delete(playerId);
      return NextResponse.json({ success: true, message: 'Removed from queue' });
    }

    if (action === 'queue') {
      // Check if already in queue
      if (matchQueue.has(playerId)) {
        const entry = matchQueue.get(playerId)!;
        const elapsed = Date.now() - entry.timestamp;
        
        // Check for timeout
        if (elapsed >= QUEUE_TIMEOUT_MS) {
          // Auto-match with AI
          return createAIMatch(playerId, deck);
        }
        
        // Still waiting
        return NextResponse.json({
          matched: false,
          queueTime: elapsed,
          suggestAI: elapsed >= AI_SUGGEST_MS,
          message: elapsed >= AI_SUGGEST_MS 
            ? 'Still searching... AI opponent available'
            : 'Searching for opponent...'
        });
      }

      // Add to queue
      matchQueue.set(playerId, {
        playerId,
        deck,
        timestamp: Date.now(),
        preferAI: false
      });

      // Try to find a match
      const opponent = findOpponent(playerId);
      
      if (opponent) {
        // Create match with human opponent
        return createHumanMatch(playerId, opponent);
      }
      
      // No match yet
      return NextResponse.json({
        matched: false,
        queueTime: 0,
        message: 'Added to queue, searching for opponent...'
      });
    }

    if (action === 'request-ai') {
      // Player explicitly requests AI opponent
      return createAIMatch(playerId, deck);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Queue error:', error);
    return NextResponse.json(
      { error: 'Failed to process queue request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  
  if (!playerId) {
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
  }

  // Check queue status
  if (matchQueue.has(playerId)) {
    const entry = matchQueue.get(playerId)!;
    const elapsed = Date.now() - entry.timestamp;
    
    // Auto-match with AI after timeout
    if (elapsed >= QUEUE_TIMEOUT_MS) {
      matchQueue.delete(playerId);
      return createAIMatch(playerId, entry.deck);
    }
    
    // Try to find match
    const opponent = findOpponent(playerId);
    if (opponent) {
      return createHumanMatch(playerId, opponent);
    }
    
    // Still in queue
    return NextResponse.json({
      matched: false,
      queueTime: elapsed,
      suggestAI: elapsed >= AI_SUGGEST_MS,
      queuePosition: getQueuePosition(playerId),
      message: getQueueMessage(elapsed)
    });
  }
  
  // Check if in active match
  if (activeMatches.has(playerId)) {
    const match = activeMatches.get(playerId);
    return NextResponse.json({
      matched: true,
      matchId: match.id,
      opponentId: match.opponentId,
      isAI: match.isAI,
      state: match.state
    });
  }
  
  return NextResponse.json({
    matched: false,
    message: 'Not in queue or match'
  });
}

function findOpponent(playerId: string): QueueEntry | null {
  // Find another player in queue (not self)
  for (const [id, entry] of matchQueue.entries()) {
    if (id !== playerId && !entry.preferAI) {
      // Check if they've been waiting long enough
      const elapsed = Date.now() - entry.timestamp;
      if (elapsed > 1000) { // At least 1 second in queue
        return entry;
      }
    }
  }
  return null;
}

function createHumanMatch(player1Id: string, opponent: QueueEntry) {
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Remove both from queue
  matchQueue.delete(player1Id);
  matchQueue.delete(opponent.playerId);
  
  // Create match state
  const matchState = {
    id: matchId,
    player1: player1Id,
    player2: opponent.playerId,
    isAI: false,
    state: 'starting',
    timestamp: Date.now()
  };
  
  // Store match for both players
  activeMatches.set(player1Id, {
    ...matchState,
    opponentId: opponent.playerId
  });
  
  activeMatches.set(opponent.playerId, {
    ...matchState,
    opponentId: player1Id
  });
  
  return NextResponse.json({
    matched: true,
    matchId,
    opponentId: opponent.playerId,
    isAI: false,
    message: 'Match found!'
  });
}

async function createAIMatch(playerId: string, deck: string[]) {
  const matchId = `ai_match_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Determine AI difficulty based on player stats
  const difficulty = determineAIDifficulty(playerId);
  
  // Create AI opponent
  const aiId = `ai_${difficulty}_${Math.random().toString(36).substring(4)}`;
  
  // Remove from queue if present
  matchQueue.delete(playerId);
  
  // Create match state with AI
  const matchState = {
    id: matchId,
    player1: playerId,
    player2: aiId,
    isAI: true,
    aiDifficulty: difficulty,
    state: 'starting',
    timestamp: Date.now()
  };
  
  // Store match
  activeMatches.set(playerId, {
    ...matchState,
    opponentId: aiId
  });
  
  return NextResponse.json({
    matched: true,
    matchId,
    opponentId: aiId,
    isAI: true,
    aiDifficulty: difficulty,
    message: `Matched with AI opponent (${difficulty})`
  });
}

function determineAIDifficulty(playerId: string): string {
  // In a real implementation, this would check player stats from database
  // For now, return a difficulty based on simple logic
  
  const random = Math.random();
  if (random < 0.3) return 'easy';
  if (random < 0.7) return 'medium';
  if (random < 0.9) return 'hard';
  return 'expert';
}

function getQueuePosition(playerId: string): number {
  let position = 1;
  const playerTimestamp = matchQueue.get(playerId)?.timestamp || 0;
  
  for (const [id, entry] of matchQueue.entries()) {
    if (id !== playerId && entry.timestamp < playerTimestamp) {
      position++;
    }
  }
  
  return position;
}

function getQueueMessage(elapsed: number): string {
  if (elapsed < 5000) {
    return 'Searching for opponent...';
  } else if (elapsed < AI_SUGGEST_MS) {
    return 'Still searching...';
  } else if (elapsed < QUEUE_TIMEOUT_MS) {
    return 'Still searching... AI opponent available';
  } else {
    return 'Matching with AI opponent...';
  }
}

// Cleanup old matches periodically
setInterval(() => {
  const now = Date.now();
  const MATCH_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  
  for (const [playerId, match] of activeMatches.entries()) {
    if (now - match.timestamp > MATCH_EXPIRY_MS) {
      activeMatches.delete(playerId);
    }
  }
  
  // Also clean up old queue entries
  for (const [playerId, entry] of matchQueue.entries()) {
    if (now - entry.timestamp > QUEUE_TIMEOUT_MS * 2) {
      matchQueue.delete(playerId);
    }
  }
}, 60000); // Every minute