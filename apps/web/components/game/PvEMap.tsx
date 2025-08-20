'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Skull
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
  const nodesPerColumn = [1, 2, 3, 2, 1]; // Diamond shape
  
  // Deterministic pseudo-random based on seed
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue += seed.charCodeAt(i) * (i + 1);
  }
  seedValue = (seedValue + region * 1000) % 10000;
  
  const random = (min: number, max: number) => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    const rnd = seedValue / 233280;
    return Math.floor(rnd * (max - min + 1)) + min;
  };

  for (let col = 0; col < columns; col++) {
    const nodeCount = nodesPerColumn[col];
    
    for (let row = 0; row < nodeCount; row++) {
      let type: NodeType;
      
      // Column 1 is always battles
      if (col === 0) {
        type = 'battle';
      } 
      // Column 5 is always boss
      else if (col === columns - 1) {
        type = 'boss';
      }
      // Mixed types for middle columns
      else {
        const roll = random(0, 100);
        if (roll < 40) type = 'battle';
        else if (roll < 60) type = 'elite';
        else if (roll < 70) type = 'shop';
        else if (roll < 80) type = 'rest';
        else if (roll < 90) type = 'event';
        else type = 'treasure';
      }

      const node: MapNode = {
        id: `node-${col}-${row}`,
        type,
        position: {
          x: 150 + col * 200,
          y: 100 + row * 150 + (3 - nodeCount) * 75
        },
        column: col,
        row,
        connections: [],
        completed: false,
        available: col === 0,
        rewards: {
          gold: type === 'battle' ? random(20, 40) : 
                type === 'elite' ? random(50, 80) :
                type === 'boss' ? random(100, 150) :
                type === 'treasure' ? random(30, 60) : undefined,
          cards: type === 'battle' ? 1 :
                 type === 'elite' ? 2 :
                 type === 'boss' ? 3 : undefined,
          relic: type === 'elite' ? random(0, 100) < 30 :
                 type === 'boss' ? true : false
        }
      };

      // Create connections to next column
      if (col < columns - 1) {
        const nextColNodes = nodesPerColumn[col + 1];
        for (let nextRow = 0; nextRow < nextColNodes; nextRow++) {
          // Connect to adjacent and nearby nodes
          if (Math.abs(nextRow - row) <= 1 || nodeCount === 1 || nextColNodes === 1) {
            node.connections.push(`node-${col + 1}-${nextRow}`);
          }
        }
      }

      nodes.push(node);
    }
  }

  return nodes;
}

export function PvEMap({ runState, onNodeClick }: PvEMapProps) {
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const nodes = useMemo(() => generateMapNodes(runState.region, runState.seed), [runState.region, runState.seed]);

  const handleNodeClick = (node: MapNode) => {
    if (node.available && !node.completed) {
      setSelectedNode(node);
      onNodeClick(node);
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
              {['battle', 'elite', 'boss', 'shop', 'rest', 'event', 'treasure'].map((type) => (
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
          <Button variant="outline" className="bg-black/40 text-white border-white/20">
            View Deck
          </Button>
          <Button variant="outline" className="bg-black/40 text-white border-white/20">
            Abandon Run
          </Button>
        </div>
      </div>
    </div>
  );
}