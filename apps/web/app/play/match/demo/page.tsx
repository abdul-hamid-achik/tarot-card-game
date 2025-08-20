'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { useGameStore } from '@/lib/store/gameStore';
import { EnemyAI } from '@/lib/ai/EnemyAI';
import { enemyTemplates } from '@/lib/ai/EnemyAI';
import { audioManager } from '@/lib/audio/AudioManager';
import { Button } from '@/components/ui/button';
import { Card } from '@/lib/store/gameStore';
import { CoinFlip } from '@/components/game/CoinFlip';

// Generate sample cards for demo using tarot cards with proper IDs
function generateDemoCards(count: number, prefix: string): Card[] {
  const cards: Card[] = [];

  // Sample tarot cards for demo with proper card IDs
  const sampleCards = [
    { id: 'major_00', name: 'The Fool', suit: 'major', cost: 0, attack: 1, health: 4 },
    { id: 'major_01', name: 'The Magician', suit: 'major', cost: 1, attack: 2, health: 3 },
    { id: 'major_02', name: 'The High Priestess', suit: 'major', cost: 2, attack: 1, health: 5 },
    { id: 'wands_01', name: 'Ace of Wands', suit: 'wands', cost: 1, attack: 3, health: 2 },
    { id: 'cups_02', name: 'Two of Cups', suit: 'cups', cost: 2, attack: 2, health: 4 },
    { id: 'swords_03', name: 'Three of Swords', suit: 'swords', cost: 3, attack: 4, health: 3 },
    { id: 'pentacles_04', name: 'Four of Pentacles', suit: 'pentacles', cost: 4, attack: 3, health: 5 },
    { id: 'wands_knight', name: 'Knight of Wands', suit: 'wands', cost: 3, attack: 4, health: 4 },
    { id: 'cups_queen', name: 'Queen of Cups', suit: 'cups', cost: 4, attack: 3, health: 6 },
    { id: 'swords_king', name: 'King of Swords', suit: 'swords', cost: 5, attack: 5, health: 5 },
  ];

  for (let i = 0; i < count; i++) {
    const template = sampleCards[i % sampleCards.length];
    cards.push({
      id: `${prefix}-${i}-${template.id}`, // Unique ID but preserves card reference
      name: template.name,
      suit: template.suit as any,
      cost: template.cost,
      attack: template.attack,
      health: template.health,
      orientation: Math.random() > 0.8 ? 'reversed' : 'upright',
      description: `${template.name} - A powerful tarot card`,
      type: template.suit === 'major' ? 'spell' : 'unit',
      rarity: template.suit === 'major' ? 'mythic' : 'common',
      deck: 'classic',
      imageUrl: `/api/card-image?id=${template.id}&deck=classic`,
      backImageUrl: '/api/ui/themes/pixel-pack/sheets/card_ui_01.png'
    });
  }

  return cards;
}

export default function MatchDemoPage() {
  const router = useRouter();
  const {
    currentMatch,
    initializeMatch,
    playCard,
    startCombat,
    endTurn
  } = useGameStore();

  const [enemyAI, setEnemyAI] = useState<EnemyAI | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showCoinFlip, setShowCoinFlip] = useState(true);
  const [enemy, setEnemy] = useState<any>(null);

  // Initialize enemy for demo
  useEffect(() => {
    console.log('Preparing demo match...');
    // Pick a random enemy
    const selectedEnemy = enemyTemplates[0]; // Luna - Apprentice Seer
    setEnemy(selectedEnemy);
    const ai = new EnemyAI(selectedEnemy);
    setEnemyAI(ai);
  }, []);

  // Handle coin flip result
  const handleCoinFlipComplete = (playerStarts: boolean) => {
    setShowCoinFlip(false);

    if (!enemy) return;

    // Generate demo decks
    const playerDeck = generateDemoCards(30, 'player');
    const aiDeck = generateDemoCards(30, 'ai');

    // Initialize match with starting hands
    const matchData = {
      matchId: `demo-${Date.now()}`,
      type: 'pve' as const,
      players: {
        player1: {
          id: 'player1',
          name: 'You',
          health: 30,
          maxHealth: 30,
          fate: playerStarts ? 1 : 0,
          maxFate: 1,
          spellMana: 0,
          hand: playerDeck.slice(0, 5),
          deck: playerDeck.slice(5),
          discard: [],
          board: Array(6).fill(null).map((_, i) => ({ id: `p1-slot-${i}`, card: null })),
          trials: []
        },
        ai: {
          id: 'ai',
          name: enemy.name,
          health: 30,
          maxHealth: 30,
          fate: playerStarts ? 0 : 1,
          maxFate: 1,
          spellMana: 0,
          hand: aiDeck.slice(0, 5),
          deck: aiDeck.slice(5),
          discard: [],
          board: Array(6).fill(null).map((_, i) => ({ id: `ai-slot-${i}`, card: null })),
          trials: [],
          avatar: enemy.portrait,
          isAI: true
        }
      },
      activePlayer: playerStarts ? 'player1' : 'ai',
      attackTokenOwner: playerStarts ? 'player1' : 'ai',
      turn: 1,
      phase: 'main' as const, // Start in main phase
      turnTimer: 60
    };

    console.log('Match data:', matchData);
    console.log('Player hand:', matchData.players.player1.hand);
    console.log('AI hand:', matchData.players.ai.hand);

    initializeMatch(matchData);
  };

  // Simple AI turn handler
  useEffect(() => {
    if (currentMatch?.activePlayer === 'ai' && enemyAI && !isAIThinking) {
      handleAITurn();
    }
  }, [currentMatch?.activePlayer, currentMatch?.turn]);

  const handleAITurn = async () => {
    if (!enemyAI || !currentMatch) return;

    setIsAIThinking(true);

    // Simple AI: play a random card only if it's AI's turn
    const aiPlayer = currentMatch.players['ai'];
    if (useGameStore.getState().currentMatch?.activePlayer !== 'ai') {
      setIsAIThinking(false);
      return;
    }
    if (aiPlayer.hand.length > 0) {
      const playableCards = aiPlayer.hand.filter(c => c.cost <= aiPlayer.fate);
      if (playableCards.length > 0) {
        const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
        const emptySlots = aiPlayer.board
          .map((slot, i) => !slot.card ? i : -1)
          .filter(i => i >= 0);

        if (emptySlots.length > 0) {
          const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
          await new Promise(resolve => setTimeout(resolve, 1000));
          playCard(randomCard, randomSlot, 'ai');
        }
      }
    }

    // Initiate combat in demo
    await new Promise(resolve => setTimeout(resolve, 500));
    if (useGameStore.getState().currentMatch?.attackTokenOwner === 'ai') {
      startCombat();
    }
    await new Promise(resolve => setTimeout(resolve, 700));
    // End AI turn
    endTurn();
    setIsAIThinking(false);
  };

  if (!currentMatch && !showCoinFlip) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading Demo Battle...</div>
      </div>
    );
  }

  return (
    <>
      {showCoinFlip && enemy ? (
        <CoinFlip
          onComplete={handleCoinFlipComplete}
          playerName="You"
          opponentName={enemy.name}
        />
      ) : (
        <GameBoard />
      )}

      {/* AI Thinking Indicator */}
      {isAIThinking && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-purple-500/50">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
              <span className="text-white">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="fixed bottom-4 left-4">
        <Button
          onClick={() => router.push('/play/pve')}
          variant="outline"
          className="bg-black/50 text-white border-white/20"
        >
          Back to Map
        </Button>
      </div>
    </>
  );
}