'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { useGameStore, MatchState, Player, Trial } from '@/lib/store/gameStore';


// Mock initial match state for demo
const createMockMatch = (matchId: string): MatchState => {
  const mockTrials: Trial[] = [
    {
      id: 'trial-sun',
      name: 'Trial of the Sun',
      description: 'Harness the power of fire',
      requirement: 'Deal 20 damage with Wands cards',
      progress: 0,
      maxProgress: 20,
      completed: false
    },
    {
      id: 'trial-moon',
      name: 'Trial of the Moon',
      description: 'Master the art of patience',
      requirement: 'End 2 turns with 5+ Fate',
      progress: 0,
      maxProgress: 2,
      completed: false
    },
    {
      id: 'trial-judgement',
      name: 'Trial of Judgement',
      description: 'Balance opposing forces',
      requirement: 'Play same card upright & reversed',
      progress: 0,
      maxProgress: 1,
      completed: false
    }
  ];

  const player1: Player = {
    id: 'player1',
    name: 'You',
    health: 20,
    maxHealth: 20,
    fate: 1,
    maxFate: 3,
    deck: [],
    hand: [
      {
        id: 'swords_02',
        name: 'Two of Swords',
        suit: 'swords',
        number: 2,
        cost: 2,
        attack: 2,
        health: 3,
        orientation: 'upright',
        description: 'Silence target enemy unit',
        reversedDescription: 'Both players discard a card',
        deck: 'classic',
        type: 'unit',
        rarity: 'common'
      },
      {
        id: 'wands_01',
        name: 'Ace of Wands',
        suit: 'wands',
        number: 1,
        cost: 1,
        attack: 3,
        health: 1,
        orientation: 'upright',
        description: 'Charge: Can attack immediately',
        reversedDescription: 'Deal 2 damage to any target',
        deck: 'classic',
        type: 'unit',
        rarity: 'common'
      },
      {
        id: 'cups_03',
        name: 'Three of Cups',
        suit: 'cups',
        number: 3,
        cost: 3,
        orientation: 'upright',
        description: 'Heal 3 health to any target',
        reversedDescription: 'Draw a card',
        deck: 'classic',
        type: 'spell',
        rarity: 'common'
      },
      {
        id: 'major_00',
        name: 'The Fool',
        suit: 'major',
        cost: 0,
        orientation: 'upright',
        description: 'Chaos - Randomize all hands',
        reversedDescription: 'New beginnings - Reset the board',
        deck: 'classic',
        type: 'major',
        rarity: 'mythic'
      },
      {
        id: 'major_01',
        name: 'The Magician',
        suit: 'major',
        cost: 1,
        orientation: 'upright',
        description: 'Manifest any card from your deck',
        reversedDescription: 'Manipulation - Swap hands with opponent',
        deck: 'classic',
        type: 'major',
        rarity: 'mythic'
      },
      {
        id: 'pentacles_05',
        name: 'Five of Pentacles',
        suit: 'pentacles',
        number: 5,
        cost: 5,
        attack: 4,
        health: 6,
        orientation: 'upright',
        description: 'Taunt: Enemies must attack this first',
        reversedDescription: 'Gain 5 gold',
        deck: 'classic',
        type: 'unit',
        rarity: 'uncommon'
      }
    ],
    discard: [],
    board: Array(6).fill(null).map((_, i) => ({ card: null, position: i })),
    trials: mockTrials
  };

  const player2: Player = {
    id: 'player2',
    name: 'Opponent',
    health: 20,
    maxHealth: 20,
    fate: 1,
    maxFate: 3,
    deck: [],
    hand: Array(4).fill(null).map((_, i) => ({
      id: `opp-card${i}`,
      name: '???',
      suit: 'swords',
      cost: 0,
      orientation: 'upright',
      description: '',
      type: 'unit',
      rarity: 'common'
    })),
    discard: [],
    board: Array(6).fill(null).map((_, i) => ({ card: null, position: i })),
    trials: mockTrials
  };

  return {
    matchId,
    turn: 1,
    phase: 'main',
    activePlayer: 'player1',
    players: {
      player1,
      player2
    },
    turnTimer: 90
  };
};

export default function MatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { setCurrentMatch, currentMatch } = useGameStore();

  useEffect(() => {
    // Initialize match state
    if (!currentMatch) {
      // In production, this would come from the server
      const mockMatch = createMockMatch(matchId);
      setCurrentMatch(mockMatch);
    }



    return () => {
      // Cleanup on unmount
    };
  }, [matchId]);

  return <GameBoard />;
}