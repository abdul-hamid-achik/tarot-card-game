import { NextRequest, NextResponse } from 'next/server';
import { LaneGameSimulator } from '@tarot/game-sim/src/sim-lanes';
import { CombatSystem } from '@tarot/game-sim/src/combat';
import { AIController } from '@tarot/game-sim/src/ai-controller';
import type { MatchState } from '@tarot/game-sim/src/types';
import { gameLogger } from '@tarot/game-logger';

// In-memory match storage (replace with database in production)
const activeMatches = new Map<string, MatchState>();

export async function POST(request: NextRequest) {
  try {
    const { matchId, action } = await request.json();

    if (!matchId || !action) {
      return NextResponse.json({ error: 'Missing matchId or action' }, { status: 400 });
    }

    // Get current match state
    let matchState = activeMatches.get(matchId);
    if (!matchState) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Process the action based on type
    let updatedState: MatchState;

    switch (action.type) {
      case 'play_card':
        updatedState = LaneGameSimulator.playCard(
          matchState,
          action.playerId,
          action.cardId,
          action.lane
        );
        break;

      case 'declare_attackers':
        updatedState = CombatSystem.declareAttackers(
          matchState,
          action.playerId,
          action.attackerIds
        );
        break;

      case 'declare_blockers':
        updatedState = CombatSystem.declareBlockers(
          matchState,
          action.playerId,
          action.blockAssignments
        );
        break;

      case 'pass':
        updatedState = LaneGameSimulator.pass(matchState, action.playerId);
        break;

      case 'end_turn':
        updatedState = LaneGameSimulator.endTurn(matchState);
        break;

      default:
        return NextResponse.json({ error: 'Unknown action type' }, { status: 400 });
    }

    // Check for victory
    const winner = CombatSystem.checkVictory(updatedState);
    if (winner) {
      updatedState.priority = winner; // Mark winner
    }

    // If it's now AI's turn, let AI make a move
    if (updatedState.currentPlayer === 'player2' && !winner) {
      const ai = new AIController('medium');
      const aiMove = ai.takeTurn(updatedState, 'player2');

      // Process AI move
      if (aiMove.type !== 'pass') {
        updatedState = LaneGameSimulator.processAction(updatedState, {
          ...aiMove.details,
          type: aiMove.type,
          playerId: 'player2'
        });
      }
    }

    // Save updated state
    activeMatches.set(matchId, updatedState);

    return NextResponse.json(updatedState);
  } catch (error) {
    gameLogger.logAction('api_match_action_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, false, 'Error processing match action');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Initialize a new match
export async function PUT(request: NextRequest) {
  try {
    const { players, cardLibrary, decks } = await request.json();

    if (!players || !cardLibrary || !decks) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const seed = Math.random().toString(36).substr(2, 9);

    const initialState = LaneGameSimulator.createInitialState({
      matchId,
      seed,
      players,
      cardLibrary,
      decks
    });

    // Start the first turn
    const matchState = LaneGameSimulator.startTurn(initialState);

    // Store the match
    activeMatches.set(matchId, matchState);

    return NextResponse.json({
      matchId,
      state: matchState
    });
  } catch (error) {
    gameLogger.logAction('api_match_init_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, false, 'Error initializing match');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}