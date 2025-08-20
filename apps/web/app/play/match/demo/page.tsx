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

// Generate sample cards for demo
function generateDemoCards(count: number, prefix: string): Card[] {
  const cards: Card[] = [];
  const suits: Array<'wands' | 'cups' | 'swords' | 'pentacles'> = ['wands', 'cups', 'swords', 'pentacles'];
  
  for (let i = 0; i < count; i++) {
    const suit = suits[i % suits.length];
    cards.push({
      id: `${prefix}-card-${i}`,
      name: `${suit.charAt(0).toUpperCase() + suit.slice(1)} Card ${i + 1}`,
      suit,
      cost: Math.floor(Math.random() * 3) + 1,
      attack: Math.floor(Math.random() * 5) + 1,
      health: Math.floor(Math.random() * 5) + 2,
      orientation: 'upright',
      description: 'A mystical tarot card',
      type: Math.random() > 0.3 ? 'unit' : 'spell',
      rarity: 'common',
      deck: 'classic'
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
    endTurn
  } = useGameStore();
  
  const [enemyAI, setEnemyAI] = useState<EnemyAI | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);

  // Initialize demo match
  useEffect(() => {
    console.log('Initializing demo match...');
    // Pick a random enemy
    const enemy = enemyTemplates[0]; // Luna - Apprentice Seer
    const ai = new EnemyAI(enemy);
    setEnemyAI(ai);
    
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
          fate: 3,
          maxFate: 3,
          hand: playerDeck.slice(0, 5),
          deck: playerDeck.slice(5),
          discard: [],
          board: Array(5).fill(null).map((_, i) => ({ id: `p1-slot-${i}`, card: null })),
          trials: []
        },
        ai: {
          id: 'ai',
          name: enemy.name,
          health: 30,
          maxHealth: 30,
          fate: 3,
          maxFate: 3,
          hand: aiDeck.slice(0, 5),
          deck: aiDeck.slice(5),
          discard: [],
          board: Array(5).fill(null).map((_, i) => ({ id: `ai-slot-${i}`, card: null })),
          trials: [],
          avatar: enemy.portrait,
          isAI: true
        }
      },
      activePlayer: 'player1',
      turn: 1,
      phase: 'main' as const,
      turnTimer: 60
    };
    
    console.log('Match data:', matchData);
    console.log('Player hand:', matchData.players.player1.hand);
    console.log('AI hand:', matchData.players.ai.hand);
    
    initializeMatch(matchData);
  }, []);

  // Simple AI turn handler
  useEffect(() => {
    if (currentMatch?.activePlayer === 'ai' && enemyAI && !isAIThinking) {
      handleAITurn();
    }
  }, [currentMatch?.activePlayer, currentMatch?.turn]);

  const handleAITurn = async () => {
    if (!enemyAI || !currentMatch) return;
    
    setIsAIThinking(true);
    
    // Simple AI: play a random card
    const aiPlayer = currentMatch.players['ai'];
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
    
    // End AI turn
    await new Promise(resolve => setTimeout(resolve, 1500));
    endTurn();
    setIsAIThinking(false);
  };

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading Demo Battle...</div>
      </div>
    );
  }

  return (
    <>
      <GameBoard />
      
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