'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PvEMap, MapNode, RunState } from '@/components/game/PvEMap';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { EnemyGenerator, GeneratedEnemy } from '@/lib/ai/EnemyGenerator';
import { EnemyAI } from '@/lib/ai/EnemyAI';
import { audioManager } from '@/lib/audio/AudioManager';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Swords,
  ShoppingBag,
  Home,
  HelpCircle,
  Heart,
  Shield,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

// Initial run state with deterministic seed
const createInitialRunState = (seed?: string): RunState => ({
  health: 30,
  maxHealth: 30,
  gold: 100,
  deck: Array(30).fill(null).map((_, i) => ({ id: `card-${i}`, name: `Card ${i}` })),
  relics: [],
  currentNodeId: null,
  region: 1,
  seed: seed || 'default'
});

export default function PvEPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [runState, setRunState] = useState<RunState>(createInitialRunState());

  // Generate random seed only on client side
  useEffect(() => {
    setIsClient(true);
    const randomSeed = Math.random().toString(36).substring(7);
    setRunState(createInitialRunState(randomSeed));
  }, []);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [currentEnemy, setCurrentEnemy] = useState<GeneratedEnemy | null>(null);
  const [showEnemyDialog, setShowEnemyDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showShopDialog, setShowShopDialog] = useState(false);
  const [showRestDialog, setShowRestDialog] = useState(false);
  const [enemyGenerator, setEnemyGenerator] = useState<EnemyGenerator | null>(null);

  // Initialize enemy generator
  React.useEffect(() => {
    setEnemyGenerator(new EnemyGenerator(runState.seed, runState.region));
  }, [runState.seed, runState.region]);

  const handleNodeClick = (node: MapNode) => {
    setSelectedNode(node);

    switch (node.type) {
      case 'battle':
      case 'elite':
      case 'boss':
        // Generate enemy and show encounter dialog
        if (enemyGenerator) {
          const enemy = enemyGenerator.generateEnemy(node.type, parseInt(node.id.split('-')[2] || '0'));
          if (enemy) {
            setCurrentEnemy(enemy);
            setShowEnemyDialog(true);
            audioManager.playRandom('cardReveal');
          } else {
            // No enemy, go directly to battle
            router.push(`/play/match/pve-${node.id}?type=${node.type}`);
          }
        }
        break;
      case 'mystery': {
        // Mystery can be a surprise fight, an event, or treasure
        if (enemyGenerator) {
          const enemy = enemyGenerator.generateEnemy('mystery', parseInt(node.id.split('-')[2] || '0'));
          if (enemy) {
            setCurrentEnemy(enemy);
            setShowEnemyDialog(true);
            audioManager.playRandom('cardReveal');
            break;
          }
        }
        // 50/50 event or treasure if no guardian
        if (Math.random() < 0.5) {
          setShowEventDialog(true);
        } else {
          handleTreasure(node);
        }
        break;
      }
      case 'event':
        setShowEventDialog(true);
        break;
      case 'shop':
        setShowShopDialog(true);
        break;
      case 'rest':
        setShowRestDialog(true);
        break;
      case 'treasure':
        handleTreasure(node);
        break;
    }
  };

  const handleTreasure = (node: MapNode) => {
    // Auto-collect treasure
    const goldReward = node.rewards?.gold || 50;
    setRunState(prev => ({
      ...prev,
      gold: prev.gold + goldReward
    }));
    // Mark node as completed
    completeNode(node);
  };

  const completeNode = (node: MapNode) => {
    // In a real app, this would update the map state
    console.log('Completing node:', node.id);
  };

  const handleEventChoice = (choice: 'accept' | 'decline') => {
    if (choice === 'accept' && runState.gold >= 50) {
      setRunState(prev => ({
        ...prev,
        gold: prev.gold - 50
      }));
      // Add omen to deck
    }
    setShowEventDialog(false);
    if (selectedNode) completeNode(selectedNode);
  };

  const handleRest = (choice: 'heal' | 'upgrade') => {
    if (choice === 'heal') {
      setRunState(prev => ({
        ...prev,
        health: Math.min(prev.health + 10, prev.maxHealth)
      }));
    }
    setShowRestDialog(false);
    if (selectedNode) completeNode(selectedNode);
  };

  const handleShopPurchase = (item: string, cost: number) => {
    if (runState.gold >= cost) {
      setRunState(prev => ({
        ...prev,
        gold: prev.gold - cost
      }));
    }
  };

  const handleAbandonRun = () => {
    // Reset run state and return to play selection
    router.push('/play');
  };

  // Show loading state until client-side seed is generated
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading the Arcanum Path...</div>
      </div>
    );
  }

  return (
    <>
      <PvEMap runState={runState} onNodeClick={handleNodeClick} onAbandonRun={handleAbandonRun} />

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-blue-400" />
              Mysterious Encounter
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-300 mb-6">
              A wandering fortune teller offers to read your future in the cards.
              She asks for 50 gold in exchange for an Omen that will aid your journey.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => handleEventChoice('accept')}
                disabled={runState.gold < 50}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Accept Reading (-50g, +Omen)
              </Button>

              <Button
                onClick={() => handleEventChoice('decline')}
                variant="outline"
                className="w-full bg-transparent text-white border-white/20"
              >
                Politely Decline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shop Dialog */}
      <Dialog open={showShopDialog} onOpenChange={setShowShopDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-yellow-400" />
              Mystic Shop
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-300">Your Gold:</span>
              <Badge className="bg-yellow-600 text-white">
                {runState.gold}g
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
                <h3 className="text-white font-bold mb-2">Remove Card</h3>
                <p className="text-xs text-gray-400 mb-3">Remove a card from your deck</p>
                <Button
                  size="sm"
                  onClick={() => handleShopPurchase('remove', 75)}
                  disabled={runState.gold < 75}
                  className="w-full"
                >
                  75g
                </Button>
              </Card>

              <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
                <h3 className="text-white font-bold mb-2">Upgrade Card</h3>
                <p className="text-xs text-gray-400 mb-3">Enhance a card's power</p>
                <Button
                  size="sm"
                  onClick={() => handleShopPurchase('upgrade', 100)}
                  disabled={runState.gold < 100}
                  className="w-full"
                >
                  100g
                </Button>
              </Card>

              <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
                <h3 className="text-white font-bold mb-2">Mystery Card</h3>
                <p className="text-xs text-gray-400 mb-3">Add a random rare card</p>
                <Button
                  size="sm"
                  onClick={() => handleShopPurchase('mystery', 150)}
                  disabled={runState.gold < 150}
                  className="w-full"
                >
                  150g
                </Button>
              </Card>

              <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
                <h3 className="text-white font-bold mb-2">Healing Potion</h3>
                <p className="text-xs text-gray-400 mb-3">Restore 10 health</p>
                <Button
                  size="sm"
                  onClick={() => {
                    handleShopPurchase('heal', 50);
                    setRunState(prev => ({
                      ...prev,
                      health: Math.min(prev.health + 10, prev.maxHealth)
                    }));
                  }}
                  disabled={runState.gold < 50}
                  className="w-full"
                >
                  50g
                </Button>
              </Card>
            </div>

            <Button
              onClick={() => setShowShopDialog(false)}
              className="w-full mt-4"
              variant="outline"
            >
              Leave Shop
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rest Dialog */}
      <Dialog open={showRestDialog} onOpenChange={setShowRestDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <Home className="w-6 h-6 text-green-400" />
              Rest Site
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-300 mb-6">
              You've found a safe place to rest. Choose how to spend your time:
            </p>

            <div className="space-y-3">
              <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
                <Button
                  onClick={() => handleRest('heal')}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Rest (+10 Health)
                </Button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Current: {runState.health}/{runState.maxHealth}
                </p>
              </Card>

              <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
                <Button
                  onClick={() => handleRest('upgrade')}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Upgrade a Card
                </Button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Permanently improve a card
                </p>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enemy Encounter Dialog */}
      <Dialog open={showEnemyDialog} onOpenChange={setShowEnemyDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <Swords className="w-6 h-6 text-red-400" />
              Enemy Encounter!
            </DialogTitle>
          </DialogHeader>

          {currentEnemy && (
            <div className="py-4">
              <div className="flex gap-6">
                {/* Enemy Portrait */}
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-32">
                    <div
                      className="absolute inset-0 rounded-lg border-2 border-purple-500/50 overflow-hidden"
                      style={{
                        backgroundImage: `url(${currentEnemy.portrait})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated'
                      }}
                    />
                    <div className="absolute -top-2 -right-2">
                      <Badge className={cn(
                        "text-white px-2 py-1",
                        currentEnemy.difficulty === 'legendary' && "bg-gradient-to-r from-purple-600 to-pink-600",
                        currentEnemy.difficulty === 'master' && "bg-gradient-to-r from-red-600 to-orange-600",
                        currentEnemy.difficulty === 'adept' && "bg-gradient-to-r from-blue-600 to-cyan-600",
                        currentEnemy.difficulty === 'apprentice' && "bg-gradient-to-r from-green-600 to-emerald-600",
                        currentEnemy.difficulty === 'novice' && "bg-gradient-to-r from-gray-600 to-gray-700"
                      )}>
                        {currentEnemy.difficulty.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Enemy Info */}
                <div className="flex-1">
                  <h3 className="text-white text-2xl font-bold mb-1">{currentEnemy.name}</h3>
                  <p className="text-purple-300 text-sm mb-3">{currentEnemy.title}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Deck Theme:</span>
                      <Badge variant="outline" className="text-white border-white/30">
                        {currentEnemy.deckTheme.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Personality:</span>
                      <Badge variant="outline" className="text-white border-white/30">
                        {currentEnemy.personality.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Power Level:</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-4 h-4 rounded-full",
                              i < Math.ceil(currentEnemy.powerLevel / 20)
                                ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                                : "bg-gray-700"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Enemy Taunt */}
                  <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <p className="text-gray-300 italic">
                      "{currentEnemy.tauntLines[0]}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Rewards Preview */}
              <div className="mt-6 bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Victory Rewards
                </h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">{currentEnemy.rewards.gold}g</span>
                    <span className="text-gray-400 text-sm">Gold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{currentEnemy.rewards.cards.length}</span>
                    <span className="text-gray-400 text-sm">Card{currentEnemy.rewards.cards.length > 1 ? 's' : ''}</span>
                  </div>
                  {currentEnemy.rewards.relics && (
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-bold">{currentEnemy.rewards.relics.length}</span>
                      <span className="text-gray-400 text-sm">Relic{currentEnemy.rewards.relics.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setShowEnemyDialog(false);
                    if (selectedNode) {
                      // Start battle with this enemy
                      router.push(`/play/match/pve?enemyId=${currentEnemy.id}&nodeId=${selectedNode.id}&type=${selectedNode.type}`);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Begin Battle
                </Button>
                <Button
                  onClick={() => setShowEnemyDialog(false)}
                  variant="outline"
                  className="flex-1 bg-transparent text-white border-white/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Flee (Skip Node)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}