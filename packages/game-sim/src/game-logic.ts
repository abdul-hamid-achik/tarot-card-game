/**
 * Enhanced game logic with proper priority and phase management
 * This integrates with the FSM to handle game flow correctly
 */

import { MatchState } from './types.js';
import { createSeededRandom } from './rng.js';
import { ExtendedIntentSchema, type IntentInput, type ExtendedIntentInput } from './schemas.js';
import { executeEffectsForPlayer, parseEffects } from './effects.js';

// Card database interface
interface CardData {
  id: string;
  name: string;
  type: 'unit' | 'spell' | 'artifact';
  spellSpeed?: 'burst' | 'fast' | 'slow';
  cost: number;
  power?: number;
  health?: number;
  effects?: string[];
}

// Get card data from database (you'll need to implement this with your actual DB)
export function getCardData(cardId: string): CardData | null {
  // TODO: Replace with actual database lookup
  const mockCards: Record<string, CardData> = {
    'major_00': { id: 'major_00', name: 'The Fool', type: 'unit', cost: 0, power: 2, health: 4 },
    'major_01': { id: 'major_01', name: 'The Magician', type: 'unit', cost: 1, power: 3, health: 3 },
    'major_02': { id: 'major_02', name: 'The High Priestess', type: 'unit', cost: 2, power: 1, health: 5 },
    'wands_01': { id: 'wands_01', name: 'Ace of Wands', type: 'spell', spellSpeed: 'fast', cost: 1, effects: ['damage:2'] },
    'cups_01': { id: 'cups_01', name: 'Ace of Cups', type: 'spell', spellSpeed: 'burst', cost: 1, effects: ['heal:3'] },
  };
  
  // Try to infer from ID if not in mock database
  if (!mockCards[cardId]) {
    if (cardId.includes('major')) {
      return { id: cardId, name: cardId, type: 'unit', cost: 2, power: 2, health: 3 };
    } else if (cardId.includes('wands') || cardId.includes('swords')) {
      return { id: cardId, name: cardId, type: 'spell', spellSpeed: 'fast', cost: 1 };
    } else {
      return { id: cardId, name: cardId, type: 'spell', spellSpeed: 'slow', cost: 2 };
    }
  }
  
  return mockCards[cardId];
}

// Check if a player has units on the board
export function hasUnitsOnBoard(state: MatchState, playerId: string): boolean {
  const battlefield = state.battlefield as Record<string, any>;
  if (!battlefield[playerId]) return false;
  
  const playerField = battlefield[playerId];
  if (Array.isArray(playerField.played)) {
    return playerField.played.length > 0;
  }
  
  // Check slot-based battlefield
  return Object.keys(battlefield).some(key => 
    key.startsWith(`${playerId}-`) && battlefield[key]
  );
}

// Get opponent player ID
export function getOpponent(state: MatchState, playerId: string): string {
  return state.players.find(p => p !== playerId) || playerId;
}

// Pass priority to the next player
export function passPriority(state: MatchState, fromPlayer: string): MatchState {
  const opponent = getOpponent(state, fromPlayer);
  return {
    ...state,
    priorityPlayer: opponent,
  };
}

// Record a player passing
export function recordPass(state: MatchState, playerId: string): MatchState {
  const passedPlayers = [...(state.passedPlayers ?? [])];
  if (!passedPlayers.includes(playerId)) {
    passedPlayers.push(playerId);
  }
  return {
    ...state,
    passedPlayers,
  };
}

// Check if both players have passed
export function bothPlayersPassed(state: MatchState): boolean {
  return (state.passedPlayers?.length ?? 0) === state.players.length;
}

// Reset passed players when an action is taken
export function resetPasses(state: MatchState): MatchState {
  return {
    ...state,
    passedPlayers: [],
  };
}

// Handle playing a card with proper priority management
export function playCard(state: MatchState, playerId: string, cardId: string, target?: string): MatchState {
  // Validate player has priority
  if (state.priorityPlayer !== playerId) {
    console.warn(`Player ${playerId} tried to play without priority`);
    return state;
  }
  
  // Get card data
  const cardData = getCardData(cardId);
  if (!cardData) {
    console.warn(`Card ${cardId} not found`);
    return state;
  }
  
  // Check resources
  const playerFate = (state.fate as Record<string, number>)[playerId] ?? 0;
  if (playerFate < cardData.cost) {
    console.warn(`Player ${playerId} doesn't have enough fate for ${cardId}`);
    return state;
  }
  
  // Spend fate
  const newFate = { ...(state.fate as Record<string, number>) };
  newFate[playerId] = playerFate - cardData.cost;
  
  // Remove from hand and add to battlefield/stack
  const hands = { ...(state.hands as Record<string, any>) };
  const playerHand = hands[playerId]?.hand ?? [];
  const cardIndex = playerHand.indexOf(cardId);
  
  if (cardIndex === -1) {
    console.warn(`Card ${cardId} not in player ${playerId}'s hand`);
    return state;
  }
  
  hands[playerId] = {
    ...hands[playerId],
    hand: playerHand.filter((c: string) => c !== cardId),
  };
  
  let newState = {
    ...state,
    fate: newFate,
    hands,
  };
  
  // Handle different card types
  if (cardData.type === 'unit') {
    // Add unit to battlefield
    const battlefield = { ...(state.battlefield as Record<string, any>) };
    const playerField = battlefield[playerId] ?? { played: [] };
    battlefield[playerId] = {
      ...playerField,
      played: [...(playerField.played ?? []), cardId],
    };
    newState.battlefield = battlefield;
  } else if (cardData.type === 'spell') {
    // Add spell to stack
    const spellStack = [...(state.spellStack ?? [])];
    spellStack.push({
      id: `spell_${Date.now()}`,
      playerId,
      cardId,
      spellSpeed: cardData.spellSpeed,
      targets: target ? [target] : [],
    });
    newState.spellStack = spellStack;
  }
  
  // Handle priority based on spell speed
  if (cardData.type === 'spell' && cardData.spellSpeed === 'burst') {
    // Burst spells don't pass priority
    newState = resetPasses(newState);
  } else {
    // Pass priority and reset passes
    newState = passPriority(resetPasses(newState), playerId);
  }
  
  return newState;
}

// Handle pass action
export function handlePass(state: MatchState, playerId: string): MatchState {
  // Record the pass
  let newState = recordPass(state, playerId);
  
  // If both players passed, check what to do
  if (bothPlayersPassed(newState)) {
    // Resolve spell stack if any
    if (newState.spellStack && newState.spellStack.length > 0) {
      newState = resolveSpellStack(newState);
    } else if (newState.phase === 'main') {
      // Check for combat
      const attackerHasUnits = hasUnitsOnBoard(newState, newState.attackTokenOwner!);
      const defenderHasUnits = hasUnitsOnBoard(newState, getOpponent(newState, newState.attackTokenOwner!));
      
      if (attackerHasUnits && defenderHasUnits) {
        // Move to combat phase
        newState = {
          ...newState,
          phase: 'combat',
          passedPlayers: [],
          priorityPlayer: newState.attackTokenOwner,
        };
      } else {
        // Skip to end phase
        newState = {
          ...newState,
          phase: 'end',
          passedPlayers: [],
        };
      }
    }
  } else {
    // Just pass priority
    newState = passPriority(newState, playerId);
  }
  
  return newState;
}

// Resolve the spell stack
export function resolveSpellStack(state: MatchState): MatchState {
  const stack = [...(state.spellStack ?? [])];
  let newState = { ...state };
  
  // Resolve spells in LIFO order (last in, first out)
  while (stack.length > 0) {
    const spell = stack.pop()!;
    console.log(`Resolving spell: ${spell.cardId} by ${spell.playerId}`);
    
    // Apply spell effects
    const cardData = getCardData(spell.cardId);
    if (cardData?.effects) {
      const calls = parseEffects(cardData.effects);
      newState = executeEffectsForPlayer(newState, calls, spell.playerId, `spell:${spell.cardId}`);
    }
  }
  
  // Clear the stack
  newState.spellStack = [];
  newState.passedPlayers = [];
  
  return newState;
}

// Initiate combat phase
export function initiateCombat(state: MatchState): MatchState {
  if (state.phase !== 'main') {
    console.warn('Cannot initiate combat outside main phase');
    return state;
  }
  
  if (state.attackTokenOwner !== state.priorityPlayer) {
    console.warn('Only attack token owner can initiate combat');
    return state;
  }
  
  return {
    ...state,
    phase: 'combat',
    passedPlayers: [],
  };
}

// Resolve combat
export function resolveCombat(state: MatchState): MatchState {
  if (state.phase !== 'combat') {
    console.warn('Not in combat phase');
    return state;
  }
  
  console.log('Resolving combat between units...');
  
  // TODO: Implement actual combat resolution
  // For now, just move to end phase
  return {
    ...state,
    phase: 'end',
    passedPlayers: [],
  };
}

// End the turn and switch attack token
export function endTurn(state: MatchState): MatchState {
  // Switch attack token
  const currentIndex = state.players.indexOf(state.attackTokenOwner!);
  const nextIndex = (currentIndex + 1) % state.players.length;
  const nextTokenOwner = state.players[nextIndex];
  
  // Increment resources
  const resources = { ...(state.resources as Record<string, number>) };
  state.players.forEach(p => {
    resources[p] = Math.min(10, (resources[p] ?? 0) + 1);
  });
  
  // Refill fate
  const fate = { ...(state.fate as Record<string, number>) };
  state.players.forEach(p => {
    fate[p] = resources[p];
  });
  
  // Draw cards
  let newState = {
    ...state,
    turn: state.turn + 1,
    phase: 'draw' as const,
    attackTokenOwner: nextTokenOwner,
    priorityPlayer: nextTokenOwner,
    passedPlayers: [],
    resources,
    fate,
  };
  
  // Each player draws a card
  state.players.forEach(playerId => {
    const decks = { ...(newState.decks as Record<string, any>) };
    const hands = { ...(newState.hands as Record<string, any>) };
    
    if (decks[playerId]?.draw?.length > 0) {
      const deck = [...decks[playerId].draw];
      const drawnCard = deck.shift();
      
      decks[playerId] = { ...decks[playerId], draw: deck };
      hands[playerId] = {
        ...hands[playerId],
        hand: [...(hands[playerId]?.hand ?? []), drawnCard],
      };
      
      newState = { ...newState, decks, hands };
    }
  });
  
  // Move to main phase after draw
  setTimeout(() => {
    newState.phase = 'main';
  }, 1000);
  
  return newState;
}