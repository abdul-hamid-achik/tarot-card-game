'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { gameLogger } from '@tarot/game-logger';
import {
  Swords,
  Shield,
  Heart,
  ShoppingBag,
  Home,
  Sparkles,
  Trophy,
  HelpCircle,
  ChevronRight,
  Map as MapIcon,
  Skull,
  X,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NodeType = 'battle' | 'elite' | 'boss' | 'event' | 'shop' | 'rest' | 'treasure' | 'mystery';

export interface MapNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  column: number;
  row: number;
  connections: string[];
  completed: boolean;
  available: boolean;
  rewards?: {
    gold?: number;
    cards?: number;
    relic?: boolean;
  };
}

export interface RunState {
  health: number;
  maxHealth: number;
  gold: number;
  deck: any[];
  relics: any[];
  currentNodeId: string | null;
  region: number;
  seed: string;
}

interface PvEMapProps {
  runState: RunState;
  onNodeClick: (node: MapNode) => void;
  onAbandonRun?: () => void;
}

const getNodeIcon = (type: NodeType) => {
  switch (type) {
    case 'battle': return <Swords className="w-6 h-6" />;
    case 'elite': return <Skull className="w-6 h-6" />;
    case 'boss': return <Trophy className="w-6 h-6" />;
    case 'event': return <HelpCircle className="w-6 h-6" />;
    case 'shop': return <ShoppingBag className="w-6 h-6" />;
    case 'rest': return <Home className="w-6 h-6" />;
    case 'treasure': return <Sparkles className="w-6 h-6" />;
    case 'mystery': return <MapIcon className="w-6 h-6" />;
  }
};

const getNodeColor = (type: NodeType) => {
  switch (type) {
    case 'battle': return 'from-red-600 to-orange-600';
    case 'elite': return 'from-purple-600 to-pink-600';
    case 'boss': return 'from-red-800 to-red-900';
    case 'event': return 'from-blue-600 to-cyan-600';
    case 'shop': return 'from-yellow-600 to-amber-600';
    case 'rest': return 'from-green-600 to-emerald-600';
    case 'treasure': return 'from-yellow-500 to-yellow-600';
    case 'mystery': return 'from-gray-600 to-gray-700';
  }
};

function generateMapNodes(region: number, seed: string): MapNode[] {
  const nodes: MapNode[] = [];
  const columns = 5;

  // Deterministic pseudo-random based on seed
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue += seed.charCodeAt(i) * (i + 1);
  }
  seedValue = (seedValue + region * 1000) % 10000;

  const nextRand = () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280; // 0..1
  };
  const randomInt = (min: number, max: number) => Math.floor(nextRand() * (max - min + 1)) + min;

  // Curated layout patterns for tactical variety without overwhelming choices.
  const patterns: number[][] = [
    [1, 2, 3, 2, 1], // diamond
    [1, 2, 2, 2, 1], // narrow middle
    [1, 3, 2, 3, 1], // a bit wider in mid columns
    [1, 2, 3, 3, 1], // extra branch near end
  ];
  const nodesPerColumn = patterns[randomInt(0, patterns.length - 1)];

  // Helper to roll weighted node types for middle columns
  const rollMiddleType = (): NodeType => {
    const roll = randomInt(0, 100);
    if (roll < 42) return 'battle';
    if (roll < 60) return 'elite';
    if (roll < 70) return 'shop';
    if (roll < 80) return 'rest';
    if (roll < 90) return 'event';
    if (roll < 96) return 'treasure';
    return 'mystery'; // rare
  };

  // Build nodes column by column
  for (let col = 0; col < columns; col++) {
    const nodeCount = nodesPerColumn[col];

    for (let row = 0; row < nodeCount; row++) {
      // Decide type
      let type: NodeType;
      if (col === 0) type = 'battle';
      else if (col === columns - 1) type = 'boss';
      else type = rollMiddleType();

      // Base grid position centered vertically per column
      const baseX = 150 + col * 200;
      const baseY = 100 + row * 150 + (3 - nodeCount) * 75;
      // Add slight jitter so runs don't look identical
      const jitterX = randomInt(-20, 20);
      const jitterY = randomInt(-30, 30);

      const node: MapNode = {
        id: `node-${col}-${row}`,
        type,
        position: { x: baseX + jitterX, y: baseY + jitterY },
        column: col,
        row,
        connections: [],
        completed: false,
        available: col === 0,
        rewards: {
          gold:
            type === 'battle'
              ? randomInt(20, 40)
              : type === 'elite'
                ? randomInt(50, 80)
                : type === 'boss'
                  ? randomInt(100, 150)
                  : type === 'treasure'
                    ? randomInt(30, 60)
                    : undefined,
          cards: type === 'battle' ? 1 : type === 'elite' ? 2 : type === 'boss' ? 3 : undefined,
          relic: type === 'elite' ? randomInt(0, 100) < 30 : type === 'boss' ? true : false,
        },
      };

      nodes.push(node);
    }
  }

  // Create connections with limited branching (1-2 choices), ensure connectivity
  for (let col = 0; col < columns - 1; col++) {
    const currentColNodes = nodes.filter((n) => n.column === col);
    const nextColNodes = nodes.filter((n) => n.column === col + 1);

    for (const node of currentColNodes) {
      const candidateRows: number[] = [];
      const nextCount = nodesPerColumn[col + 1];
      for (let nextRow = 0; nextRow < nextCount; nextRow++) {
        if (Math.abs(nextRow - node.row) <= 1 || nextCount === 1 || currentColNodes.length === 1) {
          candidateRows.push(nextRow);
        }
      }

      // Always at least one connection
      const chosen: Set<number> = new Set();
      if (candidateRows.length > 0) {
        chosen.add(candidateRows[randomInt(0, candidateRows.length - 1)]);
      } else {
        // Fallback: connect to nearest row
        chosen.add(Math.max(0, Math.min(nextCount - 1, node.row)));
      }

      // 50% chance to add a second branch if available
      if (candidateRows.length > 1 && nextRand() < 0.5) {
        let second = candidateRows[randomInt(0, candidateRows.length - 1)];
        if (chosen.has(second) && candidateRows.length > 1) {
          // try a different one
          const others = candidateRows.filter((r) => !chosen.has(r));
          if (others.length > 0) second = others[randomInt(0, others.length - 1)];
        }
        chosen.add(second);
      }

      // Small chance for a cross-link to add spice
      if (nextRand() < 0.15 && nodesPerColumn[col + 1] >= 3) {
        const farRow = Math.max(0, Math.min(nodesPerColumn[col + 1] - 1, node.row + (nextRand() < 0.5 ? -2 : 2)));
        chosen.add(farRow);
      }

      for (const r of chosen) {
        node.connections.push(`node-${col + 1}-${r}`);
      }
    }

    // Ensure every next-column node has at least one incoming connection
    for (const target of nextColNodes) {
      const hasIncoming = currentColNodes.some((n) => n.connections.includes(target.id));
      if (!hasIncoming) {
        // Connect from the nearest row in the previous column
        let nearest = currentColNodes[0];
        let bestDist = Math.abs(nearest.row - target.row);
        for (const n of currentColNodes) {
          const d = Math.abs(n.row - target.row);
          if (d < bestDist) {
            bestDist = d;
            nearest = n;
          }
        }
        nearest.connections.push(target.id);
      }
    }
  }

  return nodes;
}

export function PvEMap({ runState, onNodeClick, onAbandonRun }: PvEMapProps) {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [showDeckDialog, setShowDeckDialog] = useState(false);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const nodes = useMemo(() => generateMapNodes(runState.region, runState.seed), [runState.region, runState.seed]);

  const handleNodeClick = (node: MapNode) => {
    if (node.available && !node.completed) {
      gameLogger.logAction('pve_node_clicked', {
        nodeId: node.id,
        nodeType: node.type,
        nodeAvailable: node.available,
        nodeCompleted: node.completed,
        runState: runState
      }, true, 'Player clicked on PVE map node');
      setSelectedNode(node);
      onNodeClick(node);
    } else {
      gameLogger.logAction('pve_node_click_ignored', {
        nodeId: node.id,
        nodeType: node.type,
        nodeAvailable: node.available,
        nodeCompleted: node.completed,
        reason: !node.available ? 'node_not_available' : 'node_already_completed'
      }, true, 'PVE node click ignored - node not available or completed');
    }
  };

  const handleAbandonRun = () => {
    gameLogger.logAction('pve_run_abandoned', {
      runState: runState,
      reason: 'player_choice'
    }, true, 'Player abandoned PVE run');
    setShowAbandonDialog(false);
    if (onAbandonRun) {
      onAbandonRun();
    } else {
      // Default behavior - go back to play selection
      router.push('/play/pve');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Region {runState.region}: The Arcanum Path
            </h1>
            <p className="text-gray-300">Choose your path wisely</p>
          </div>

          {/* Run Info */}
          <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Heart className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <div className="text-white font-bold">{runState.health}/{runState.maxHealth}</div>
                <div className="text-xs text-gray-400">Health</div>
              </div>
              <div className="text-center">
                <Sparkles className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <div className="text-white font-bold">{runState.gold}</div>
                <div className="text-xs text-gray-400">Gold</div>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <div className="text-white font-bold">{runState.deck.length}</div>
                <div className="text-xs text-gray-400">Cards</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Map Container */}
        <div className="relative bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-8 min-h-[600px]">
          {/* SVG for paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {nodes.map((node) =>
              node.connections.map((targetId) => {
                const targetNode = nodes.find(n => n.id === targetId);
                if (!targetNode) return null;

                return (
                  <motion.line
                    key={`${node.id}-${targetId}`}
                    x1={node.position.x}
                    y1={node.position.y}
                    x2={targetNode.position.x}
                    y2={targetNode.position.y}
                    stroke={node.completed ? '#4B5563' : '#9CA3AF'}
                    strokeWidth="2"
                    strokeDasharray={node.completed ? "0" : "5,5"}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: node.column * 0.1 }}
                  />
                );
              })
            )}
          </svg>

          {/* Nodes */}
          {nodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05, type: "spring" }}
              className="absolute"
              style={{
                left: node.position.x - 40,
                top: node.position.y - 40
              }}
            >
              <motion.button
                whileHover={node.available && !node.completed ? { scale: 1.1 } : {}}
                whileTap={node.available && !node.completed ? { scale: 0.95 } : {}}
                onClick={() => handleNodeClick(node)}
                disabled={!node.available || node.completed}
                className={cn(
                  "relative w-20 h-20 rounded-full border-4 transition-all",
                  node.completed
                    ? "bg-gray-800 border-gray-700 cursor-not-allowed"
                    : node.available
                      ? "cursor-pointer hover:shadow-lg hover:shadow-yellow-500/50"
                      : "bg-gray-900 border-gray-800 cursor-not-allowed opacity-50"
                )}
              >
                <div className={cn(
                  "w-full h-full rounded-full flex items-center justify-center",
                  !node.completed && node.available && `bg-gradient-to-br ${getNodeColor(node.type)}`
                )}>
                  <div className={cn(
                    "text-white",
                    node.completed && "opacity-30"
                  )}>
                    {getNodeIcon(node.type)}
                  </div>
                </div>

                {/* Available pulse animation */}
                {node.available && !node.completed && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-yellow-400"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                  />
                )}

                {/* Rewards preview */}
                {node.rewards && !node.completed && (
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {node.rewards.gold && (
                      <Badge variant="outline" className="text-xs bg-black/80">
                        {node.rewards.gold}g
                      </Badge>
                    )}
                    {node.rewards.relic && (
                      <Badge variant="outline" className="text-xs bg-purple-900/80">
                        Relic
                      </Badge>
                    )}
                  </div>
                )}
              </motion.button>
            </motion.div>
          ))}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h3 className="text-white font-bold mb-2 text-sm">Legend</h3>
            <div className="space-y-2">
              {['battle', 'elite', 'boss', 'shop', 'rest', 'event', 'treasure', 'mystery'].map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getNodeColor(type as NodeType)} flex items-center justify-center`}>
                    <div className="text-white scale-50">
                      {getNodeIcon(type as NodeType)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            className="bg-black/40 text-white border-white/20 hover:bg-white/10"
            onClick={() => setShowDeckDialog(true)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            View Deck
          </Button>
          <Button
            variant="outline"
            className="bg-black/40 text-red-300 border-red-400/20 hover:bg-red-500/20"
            onClick={() => setShowAbandonDialog(true)}
          >
            <X className="w-4 h-4 mr-2" />
            Abandon Run
          </Button>
        </div>
      </div>

      {/* View Deck Dialog */}
      <Dialog open={showDeckDialog} onOpenChange={setShowDeckDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" />
              Current Deck ({runState.deck.length} cards)
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {runState.deck.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">No cards in deck</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {runState.deck.map((card, index) => (
                  <Card key={index} className="bg-black/40 backdrop-blur-sm border-white/10 p-3">
                    <div className="aspect-[2/3] bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg mb-2 flex items-center justify-center border border-white/10">
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Sparkles className="w-8 h-8 text-purple-400" />
                      )}
                    </div>
                    <h4 className="text-white text-xs font-bold mb-1 truncate">
                      {card.name || `Card ${index + 1}`}
                    </h4>
                    {card.suit && (
                      <Badge variant="outline" className="text-xs text-gray-300 border-gray-600">
                        {card.suit}
                      </Badge>
                    )}
                    {(card.attack !== undefined || card.health !== undefined) && (
                      <div className="flex gap-1 mt-1">
                        {card.attack !== undefined && (
                          <Badge variant="outline" className="text-xs text-red-300 border-red-600/50">
                            {card.attack}⚔
                          </Badge>
                        )}
                        {card.health !== undefined && (
                          <Badge variant="outline" className="text-xs text-green-300 border-green-600/50">
                            {card.health}❤
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setShowDeckDialog(false)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Abandon Run Confirmation Dialog */}
      <Dialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-red-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Abandon Run?
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to abandon your current run? All progress will be lost:
              </p>

              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Heart className="w-6 h-6 text-red-400 mx-auto mb-1" />
                    <div className="text-white font-bold">{runState.health}/{runState.maxHealth}</div>
                    <div className="text-xs text-gray-400">Health</div>
                  </div>
                  <div>
                    <Sparkles className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                    <div className="text-white font-bold">{runState.gold}</div>
                    <div className="text-xs text-gray-400">Gold</div>
                  </div>
                  <div>
                    <Shield className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                    <div className="text-white font-bold">{runState.deck.length}</div>
                    <div className="text-xs text-gray-400">Cards</div>
                  </div>
                </div>

                {runState.relics.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-gray-400 text-sm text-center">
                      + {runState.relics.length} Relic{runState.relics.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowAbandonDialog(false)}
                variant="outline"
                className="flex-1 bg-transparent text-white border-white/20"
              >
                Continue Run
              </Button>
              <Button
                onClick={handleAbandonRun}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white"
              >
                <X className="w-4 h-4 mr-2" />
                End Run
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}