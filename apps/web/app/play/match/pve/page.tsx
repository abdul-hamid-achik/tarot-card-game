'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { useGameStore } from '@/lib/store/gameStore';
import { EnemyAI } from '@/lib/ai/EnemyAI';
import { enemyTemplates } from '@/lib/ai/EnemyAI';
import { gameLogger } from '@tarot/game-logger';
import { EnemyGenerator } from '@/lib/ai/EnemyGenerator';
import { audioManager } from '@/lib/audio/AudioManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/lib/store/gameStore';
import { CoinFlip } from '@/components/game/CoinFlip';

// Generate sample cards for PVE matches with proper card IDs
function generateDeck(count: number, prefix: string): Card[] {
  const cards: Card[] = [];

  // Sample tarot cards with proper IDs for the classic deck
  const sampleCards = [
    { id: 'major_00', name: 'The Fool', suit: 'major', cost: 0, attack: 1, health: 4 },
    { id: 'major_01', name: 'The Magician', suit: 'major', cost: 1, attack: 2, health: 3 },
    { id: 'major_02', name: 'The High Priestess', suit: 'major', cost: 2, attack: 1, health: 5 },
    { id: 'major_03', name: 'The Empress', suit: 'major', cost: 3, attack: 2, health: 6 },
    { id: 'major_04', name: 'The Emperor', suit: 'major', cost: 4, attack: 4, health: 5 },
    { id: 'wands_01', name: 'Ace of Wands', suit: 'wands', cost: 1, attack: 3, health: 2 },
    { id: 'cups_02', name: 'Two of Cups', suit: 'cups', cost: 2, attack: 2, health: 4 },
    { id: 'swords_03', name: 'Three of Swords', suit: 'swords', cost: 3, attack: 4, health: 3 },
    { id: 'pentacles_04', name: 'Four of Pentacles', suit: 'pentacles', cost: 4, attack: 3, health: 5 },
    { id: 'wands_knight', name: 'Knight of Wands', suit: 'wands', cost: 3, attack: 4, health: 4 },
    { id: 'cups_queen', name: 'Queen of Cups', suit: 'cups', cost: 4, attack: 3, health: 6 },
    { id: 'swords_king', name: 'King of Swords', suit: 'swords', cost: 5, attack: 5, health: 5 },
    { id: 'pentacles_page', name: 'Page of Pentacles', suit: 'pentacles', cost: 2, attack: 2, health: 3 },
    { id: 'cups_knight', name: 'Knight of Cups', suit: 'cups', cost: 3, attack: 3, health: 4 },
    { id: 'swords_queen', name: 'Queen of Swords', suit: 'swords', cost: 4, attack: 4, health: 4 },
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
      description: `${template.name} - A mystical tarot card`,
      type: 'unit', // All cards with attack/health are units
      rarity: template.suit === 'major' ? 'mythic' : 'common',
      deck: 'classic',
      imageUrl: `/api/card-image?id=${template.id}&deck=classic`,
      backImageUrl: '/api/ui/themes/pixel-pack/sheets/card_ui_01.png'
    });
  }

  return cards;
}

function PvEInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enemyId = searchParams.get('enemyId');
  const nodeId = searchParams.get('nodeId');
  const nodeType = searchParams.get('type');

  const {
    currentMatch,
    initializeMatch,
    playCard,
    startCombat,
    endTurn,
    updateMatch
  } = useGameStore();

  const [enemyAI, setEnemyAI] = useState<EnemyAI | null>(null);
  const [currentEnemy, setCurrentEnemy] = useState<any>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showVictoryDialog, setShowVictoryDialog] = useState(false);
  const [showDefeatDialog, setShowDefeatDialog] = useState(false);
  const [victoryRewards, setVictoryRewards] = useState<any>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(true);
  const [matchInitialized, setMatchInitialized] = useState(false);

  // Initialize match data but don't start until coin flip
  useEffect(() => {
    if (enemyId && !matchInitialized) {
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

        // Store match data but don't initialize yet
        setMatchInitialized(true);
      }
    }
  }, [enemyId, nodeType, nodeId, matchInitialized]);

  // Handle coin flip result
  const handleCoinFlipComplete = (playerStarts: boolean) => {
    setShowCoinFlip(false);

    // Find enemy template or generate one
    let enemy = enemyTemplates.find(e => e.id === enemyId);

    if (!enemy && nodeType) {
      const generator = new EnemyGenerator('default-seed', 1);
      const generated = generator.generateEnemy(nodeType as any, 0);
      if (generated) {
        enemy = generated;
      }
    }

    if (enemy) {
      // Generate decks for both players
      const playerDeck = generateDeck(30, 'player');
      const aiDeck = generateDeck(30, 'ai');

      // Draw starting hands (5 cards each)
      const playerHand = playerDeck.slice(0, 5);
      const playerRemainingDeck = playerDeck.slice(5);
      const aiHand = aiDeck.slice(0, 5);
      const aiRemainingDeck = aiDeck.slice(5);

      // Initialize match with correct starting player
      initializeMatch({
        matchId: `pve-${nodeId || Date.now()}`,
        type: 'pve',
        players: {
          player1: {
            id: 'player1',
            name: 'You',
            health: 30,
            maxHealth: 30,
            // Fate system start
            maxFate: playerStarts ? 1 : 0,
            fate: playerStarts ? 1 : 0,
            spellMana: 0,
            hand: playerHand,
            deck: playerRemainingDeck,
            discard: [],
            bench: Array(6).fill(null),
            battlefield: Array(6).fill(null),
            trials: []
          },
          ai: {
            id: 'ai',
            name: enemy.name,
            health: 30 + Math.floor((enemy as any).powerLevel / 10 || 0),
            maxHealth: 30 + Math.floor((enemy as any).powerLevel / 10 || 0),
            // Non-starting player gets 0/1 at start
            maxFate: playerStarts ? 0 : 1,
            fate: playerStarts ? 0 : 1,
            spellMana: 0,
            hand: aiHand,
            deck: aiRemainingDeck,
            discard: [],
            bench: Array(6).fill(null),
            battlefield: Array(6).fill(null),
            trials: [],
            avatar: enemy.portrait,
            isAI: true
          }
        },
        activePlayer: playerStarts ? 'player1' : 'ai',
        attackTokenOwner: playerStarts ? 'player1' : 'ai',
        turn: 1,
        phase: 'main', // Start in main phase so cards can be played
        turnTimer: 60
      });

      // Play taunt sound
      audioManager.playRandom('enemyEncounter');
    }
  };

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
    const playerBoard = currentMatch.players['player1'].bench || currentMatch.players['player1'].board;

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000));

    // AI decision: play cards while it has fate to cover costs
    let remainingFate = aiPlayer.fate + (aiPlayer.spellMana || 0);
    let plays = 0;
    while (plays < 3 && remainingFate > 0 && useGameStore.getState().currentMatch?.activePlayer === 'ai') {
      const decision = await enemyAI.decideCardToPlay(
        aiPlayer.hand,
        remainingFate,
        aiPlayer.bench || aiPlayer.board,
        playerBoard,
        currentMatch.phase
      );

      if (decision) {
        // Verify affordability just before play
        if (decision.card.cost <= remainingFate) {
          playCard(decision.card, decision.targetSlot, 'ai');
          remainingFate -= decision.card.cost;
          plays++;
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // End AI turn
    await new Promise(resolve => setTimeout(resolve, 400));
    // Initiate combat for AI only if it has attackers on bench
    const latest = useGameStore.getState().currentMatch;
    const aiHasUnits = latest?.players['ai'].bench?.some((unit: any) => unit !== null) || 
                      latest?.players['ai'].board?.some((s: any) => s?.card);
    if (latest?.attackTokenOwner === 'ai' && aiHasUnits) {
      startCombat();
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    endTurn();
    setIsAIThinking(false);
  };

  const handleVictory = () => {
    // Award rewards
    if (victoryRewards) {
      // In a real implementation, this would update the player's collection
      gameLogger.logAction('victory_rewards_awarded', {
        rewards: victoryRewards,
        playerId: 'player1'
      }, true, 'Awarding victory rewards to player');
    }

    setShowVictoryDialog(false);
    router.push('/play/pve');
  };

  const handleDefeat = () => {
    setShowDefeatDialog(false);
    router.push('/play/pve');
  };

  if (!currentMatch && !showCoinFlip) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading Battle...</div>
      </div>
    );
  }

  return (
    <>
      {showCoinFlip && currentEnemy ? (
        <CoinFlip
          onComplete={handleCoinFlipComplete}
          playerName="You"
          opponentName={currentEnemy.name}
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

export default function PvEMatchPage() {
  return (
    <Suspense>
      <PvEInner />
    </Suspense>
  );
}