'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { useGameStore } from '@/lib/store/gameStore';
import { EnemyAI } from '@/lib/ai/EnemyAI';
import { enemyTemplates } from '@/lib/ai/EnemyAI';
import { EnemyGenerator } from '@/lib/ai/EnemyGenerator';
import { audioManager } from '@/lib/audio/AudioManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PvEMatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enemyId = searchParams.get('enemyId');
  const nodeId = searchParams.get('nodeId');
  const nodeType = searchParams.get('type');
  
  const { 
    currentMatch, 
    initializeMatch,
    playCard,
    endTurn,
    updateMatch
  } = useGameStore();
  
  const [enemyAI, setEnemyAI] = useState<EnemyAI | null>(null);
  const [currentEnemy, setCurrentEnemy] = useState<any>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showVictoryDialog, setShowVictoryDialog] = useState(false);
  const [showDefeatDialog, setShowDefeatDialog] = useState(false);
  const [victoryRewards, setVictoryRewards] = useState<any>(null);

  // Initialize match with AI enemy
  useEffect(() => {
    if (enemyId) {
      // Find enemy template or generate one
      let enemy = enemyTemplates.find(e => e.id === enemyId);
      
      if (!enemy && nodeType) {
        // Generate enemy if not found
        const generator = new EnemyGenerator('default-seed', 1);
        const generated = generator.generateEnemy(nodeType as any, 0);
        if (generated) {
          setCurrentEnemy(generated);
          setVictoryRewards(generated.rewards);
          enemy = generated;
        }
      } else if (enemy) {
        setCurrentEnemy(enemy);
      }
      
      if (enemy) {
        // Initialize AI
        const ai = new EnemyAI(enemy);
        setEnemyAI(ai);
        
        // Initialize match
        initializeMatch({
          matchId: `pve-${nodeId || Date.now()}`,
          type: 'pve',
          players: {
            player1: {
              id: 'player1',
              name: 'You',
              health: 30,
              maxHealth: 30,
              fate: 3,
              maxFate: 3,
              hand: [],
              deck: [],
              discard: [],
              board: Array(5).fill(null).map((_, i) => ({ id: `p1-slot-${i}`, card: null })),
              trials: []
            },
            ai: {
              id: 'ai',
              name: enemy.name,
              health: 30 + Math.floor((enemy as any).powerLevel / 10 || 0),
              maxHealth: 30 + Math.floor((enemy as any).powerLevel / 10 || 0),
              fate: 3,
              maxFate: 3,
              hand: [],
              deck: (enemy as any).deck || [],
              discard: [],
              board: Array(5).fill(null).map((_, i) => ({ id: `ai-slot-${i}`, card: null })),
              trials: [],
              avatar: enemy.portrait
            }
          },
          activePlayer: 'player1',
          turn: 1,
          phase: 'draw',
          turnTimer: 60
        });
        
        // Play taunt sound
        audioManager.playRandom('enemyEncounter');
      }
    }
  }, [enemyId, nodeType, nodeId]);

  // AI turn handler
  useEffect(() => {
    if (currentMatch?.activePlayer === 'ai' && enemyAI && !isAIThinking) {
      handleAITurn();
    }
  }, [currentMatch?.activePlayer, currentMatch?.turn]);

  // Check for victory/defeat
  useEffect(() => {
    if (currentMatch) {
      const player = currentMatch.players['player1'];
      const ai = currentMatch.players['ai'];
      
      if (player.health <= 0) {
        setShowDefeatDialog(true);
        audioManager.playRandom('defeat');
      } else if (ai.health <= 0) {
        setShowVictoryDialog(true);
        audioManager.playRandom('victory');
      }
    }
  }, [currentMatch?.players]);

  const handleAITurn = async () => {
    if (!enemyAI || !currentMatch) return;
    
    setIsAIThinking(true);
    
    const aiPlayer = currentMatch.players['ai'];
    const playerBoard = currentMatch.players['player1'].board;
    
    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // AI decision: play cards
    for (let i = 0; i < 3; i++) { // Try to play up to 3 cards
      const decision = await enemyAI.decideCardToPlay(
        aiPlayer.hand,
        aiPlayer.fate,
        aiPlayer.board,
        playerBoard,
        currentMatch.phase
      );
      
      if (decision) {
        // Play the card
        playCard(decision.card, decision.targetSlot, 'ai');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // End AI turn
    await new Promise(resolve => setTimeout(resolve, 1000));
    endTurn();
    setIsAIThinking(false);
  };

  const handleVictory = () => {
    // Award rewards
    if (victoryRewards) {
      // In a real implementation, this would update the player's collection
      console.log('Awarding rewards:', victoryRewards);
    }
    
    setShowVictoryDialog(false);
    router.push('/play/pve');
  };

  const handleDefeat = () => {
    setShowDefeatDialog(false);
    router.push('/play/pve');
  };

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading Battle...</div>
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
              <span className="text-white">
                {currentEnemy?.name} is thinking...
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Victory Dialog */}
      <Dialog open={showVictoryDialog} onOpenChange={setShowVictoryDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-3xl text-white flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Victory!
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {currentEnemy && (
              <div className="mb-6">
                <p className="text-gray-300 mb-4 italic">
                  "{currentEnemy.defeatLine}"
                </p>
              </div>
            )}
            
            {victoryRewards && (
              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-bold mb-3">Rewards Earned:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold text-lg">+{victoryRewards.gold}g</span>
                    <span className="text-gray-400">Gold</span>
                  </div>
                  {victoryRewards.cards.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold text-lg">+{victoryRewards.cards.length}</span>
                      <span className="text-gray-400">New Card{victoryRewards.cards.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {victoryRewards.relics && (
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-bold text-lg">+{victoryRewards.relics.length}</span>
                      <span className="text-gray-400">Relic{victoryRewards.relics.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <Button
              onClick={handleVictory}
              className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              Continue Journey
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Defeat Dialog */}
      <Dialog open={showDefeatDialog} onOpenChange={setShowDefeatDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-red-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-3xl text-white flex items-center gap-2">
              <X className="w-8 h-8 text-red-400" />
              Defeat
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {currentEnemy && (
              <div className="mb-6">
                <p className="text-gray-300 mb-4 italic">
                  "{currentEnemy.victoryLine}"
                </p>
              </div>
            )}
            
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-6">
              <p className="text-gray-300">
                Your journey ends here... but the Arcanum remembers.
                Return stronger and wiser.
              </p>
            </div>
            
            <Button
              onClick={handleDefeat}
              className="w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800"
            >
              Return to Map
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}