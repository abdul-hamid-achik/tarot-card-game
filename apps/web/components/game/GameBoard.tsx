'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { Card, useGameStore } from '@/lib/store/gameStore';
import { TarotCard } from './TarotCard';
import { CardOverlay } from './CardOverlay';
import { CardActionMenu } from './CardActionMenu';
import { GameMenu } from './GameMenu';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audio/AudioManager';
import { gameLogger } from '@tarot/game-logger';
import { Sword, Shield, Heart, Sparkles, ChevronRight } from 'lucide-react';

// Hand card component - no drag, just click
function HandCard({ card, idx, onCardClick }: {
  card: Card;
  idx: number;
  onCardClick: (card: Card, zone: 'hand', index: number, event?: React.MouseEvent) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCardClick(card, 'hand', idx, e);
  };

  return (
    <motion.div
      key={card.id}
      initial={{ y: 20, opacity: 0 }}
      animate={{
        y: 0,
        opacity: 1,
        scale: 1
      }}
      transition={{ delay: idx * 0.05 }}
      whileHover={{ y: -10, scale: 1.05 }}
      className="cursor-pointer"
      onClick={handleClick}
    >
      <TarotCard card={card} scale={0.8} isDraggable={false} />
    </motion.div>
  );
}

interface BoardSlotProps {
  card: Card | null;
  unit: any;
  index: number;
  isPlayer: boolean;
  zone: 'bench' | 'battlefield';
  onCardClick?: (card: Card, zone: 'bench' | 'battlefield', index: number, event?: React.MouseEvent) => void;
  playerId: string;
}

function BoardSlot({ card, unit, index, isPlayer, zone, onCardClick, playerId }: BoardSlotProps) {
  const actualCard = unit?.card || card;
  const slotId = `${playerId}-${zone}-${index}`;

  // Both bench and battlefield cards can be dragged
  // Bench cards can be dragged to battlefield, battlefield cards can be reordered
  const canDrag = isPlayer && actualCard && (zone === 'battlefield' || zone === 'bench');

  // Make slots droppable (battlefield for reordering/receiving, bench can't receive)
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { zone, index, playerId },
    disabled: !isPlayer || (zone === 'bench' && actualCard) // Can't drop on occupied bench slots
  });

  // Make cards draggable (only in battlefield for reordering)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: actualCard?.id || slotId,
    data: { card: actualCard, fromZone: zone, fromIndex: index, playerId },
    disabled: !canDrag
  });

  // Different sizes for different zones - made larger for better visibility
  const slotSize = zone === 'battlefield'
    ? "w-[130px] h-[182px]"  // Bigger for battlefield (manifestation)
    : "w-[100px] h-[140px]";   // Smaller for bench (reading row)

  const cardScale = zone === 'battlefield' ? 1.2 : 0.95;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative rounded-lg transition-all",
        slotSize,
        "border-2",
        actualCard ? "border-tarot-gold/30" : "border-white/10",
        zone === 'battlefield' && "shadow-lg",
        isOver && "border-tarot-gold bg-tarot-gold/10 scale-105",
        isDragging && "opacity-50"
      )}
      data-tutorial={isPlayer ? `${zone}-${index}` : undefined}
    >
      {actualCard && (
        <motion.div
          ref={canDrag ? setDragRef : undefined}
          layoutId={actualCard.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: isDragging ? 0.5 : 1,
            scale: 1,
            x: transform?.x ?? 0,
            y: transform?.y ?? 0
          }}
          className={cn(
            "absolute inset-0",
            canDrag ? "cursor-move" : "cursor-pointer"
          )}
          onClick={(e) => {
            if (!isDragging && isPlayer) {
              onCardClick?.(actualCard, zone, index, e);
            }
          }}
          {...(canDrag ? attributes : {})}
          {...(canDrag ? listeners : {})}
        >
          <TarotCard card={actualCard} scale={cardScale} isDraggable={false} />
        </motion.div>
      )}
      {!actualCard && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/10 text-4xl">{index + 1}</span>
        </div>
      )}
    </div>
  );
}

interface NexusProps {
  health: number;
  maxHealth: number;
  isPlayer: boolean;
  name: string;
}

function Nexus({ health, maxHealth, isPlayer, name }: NexusProps) {
  const healthPercent = (health / maxHealth) * 100;

  return (
    <div className={cn(
      "relative w-24 h-32",
      "bg-gradient-to-br from-purple-900/80 to-black/80",
      "rounded-xl border-2",
      health <= 5 ? "border-red-500 animate-pulse" : isPlayer ? "border-tarot-gold" : "border-red-400",
      "shadow-2xl backdrop-blur-sm"
    )}>
      {/* Health Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Heart className={cn(
          "w-8 h-8 mb-1",
          health <= 5 ? "text-red-500" : "text-red-400"
        )} />
        <span className={cn(
          "text-2xl font-bold",
          health <= 5 ? "text-red-500" : "text-white"
        )}>
          {health}
        </span>
        <span className="text-xs text-gray-400">/{maxHealth}</span>
      </div>

      {/* Name */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs text-white/60 font-medium">{name}</span>
      </div>

      {/* Health Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 rounded-b-xl overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            health <= 5 ? "bg-red-500" : "bg-green-500"
          )}
          style={{ width: `${healthPercent}%` }}
        />
      </div>
    </div>
  );
}

interface GameBoardProps {
  disableAI?: boolean; // Option to disable built-in AI (for when parent component handles it)
}

export function GameBoard({ disableAI = false }: GameBoardProps = {}) {
  const { currentMatch, playCard, endTurn, updateMatch, startCombat, executeAITurn } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardOverlay, setShowCardOverlay] = useState(false);
  const [actionMenuCard, setActionMenuCard] = useState<Card | null>(null);
  const [actionMenuZone, setActionMenuZone] = useState<'hand' | 'bench' | 'battlefield'>('hand');
  const [actionMenuIndex, setActionMenuIndex] = useState<number>(0);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [playerHandExpanded, setPlayerHandExpanded] = useState(false);
  const [enemyHandExpanded, setEnemyHandExpanded] = useState(false);

  // Configure sensors with activation constraint (delay + tolerance)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Handle AI turns with useRef to prevent infinite loops
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAITurn = useRef<string>('');

  useEffect(() => {
    if (!currentMatch || disableAI) return; // Skip if AI is disabled

    // Check if it's AI's turn
    const isAITurn = currentMatch.activePlayer === 'ai' || currentMatch.activePlayer === 'player2';
    const turnKey = `${currentMatch.activePlayer}-${currentMatch.turn}`;

    // Only execute if this is a new AI turn (not a repeat)
    if (isAITurn && turnKey !== lastAITurn.current) {
      lastAITurn.current = turnKey;

      // Clear any existing timer
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }

      // Execute AI turn after a short delay for better UX
      aiTimerRef.current = setTimeout(() => {
        if (executeAITurn) {
          executeAITurn();
        } else {
          // Fallback: just end turn if no AI implementation
          console.log('AI taking turn...');
          endTurn();
        }
      }, 1500);
    }

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [currentMatch?.activePlayer, currentMatch?.turn, executeAITurn, endTurn, disableAI]);

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
        <div className="text-tarot-gold text-2xl animate-pulse">Consulting the Fates...</div>
      </div>
    );
  }

  const currentPlayerId = 'player1';
  const opponentId = Object.keys(currentMatch.players).find(id => id !== currentPlayerId) || 'ai';
  const currentPlayer = currentMatch.players[currentPlayerId];
  const opponentPlayer = currentMatch.players[opponentId];
  const isMyTurn = currentMatch.activePlayer === currentPlayerId;
  const hasAttackToken = currentMatch.attackTokenOwner === currentPlayerId;

  // Handle card clicks from different zones
  const handleCardClick = (card: Card, zone: 'hand' | 'bench' | 'battlefield', index: number = 0, event?: React.MouseEvent) => {
    if (event) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setActionMenuCard(card);
      setActionMenuZone(zone);
      setActionMenuIndex(index);
      setActionMenuPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setShowActionMenu(true);
    }
  };

  // Handle actions from the card menu
  const handleCardAction = (action: 'view' | 'play' | 'attack' | 'block' | 'return') => {
    if (!actionMenuCard || !currentMatch) return;

    switch (action) {
      case 'view':
        setSelectedCard(actionMenuCard);
        setShowCardOverlay(true);
        break;

      case 'play':
        // Play from hand to reading row (bench)
        const emptySlot = currentPlayer?.bench?.findIndex(slot => !slot);
        if (emptySlot !== undefined && emptySlot >= 0) {
          playCard(actionMenuCard, emptySlot);
          audioManager.playRandom('cardPlace');
        }
        break;

      case 'attack':
      case 'block':
        // Move from bench to battlefield
        if (actionMenuZone === 'bench') {
          const benchUnit = currentPlayer?.bench?.[actionMenuIndex];
          if (benchUnit) {
            // Find empty battlefield slot
            const emptyBattlefieldSlot = currentPlayer?.battlefield?.findIndex(slot => !slot);
            if (emptyBattlefieldSlot !== undefined && emptyBattlefieldSlot >= 0) {
              // Move unit from bench to battlefield
              const updatedBench = [...(currentPlayer.bench || [])];
              const updatedBattlefield = [...(currentPlayer.battlefield || [])];
              updatedBattlefield[emptyBattlefieldSlot] = benchUnit;
              updatedBench[actionMenuIndex] = null;

              updateMatch({
                ...currentMatch,
                players: {
                  ...currentMatch.players,
                  [currentPlayerId]: {
                    ...currentPlayer,
                    bench: updatedBench,
                    battlefield: updatedBattlefield
                  }
                }
              });

              if (action === 'attack' && hasAttackToken) {
                // Initiate combat after moving to battlefield
                setTimeout(() => startCombat(), 500);
              }
            }
          }
        }
        break;

      case 'return':
        // Move from battlefield back to bench
        if (actionMenuZone === 'battlefield') {
          const battlefieldUnit = currentPlayer?.battlefield?.[actionMenuIndex];
          if (battlefieldUnit) {
            // Find empty bench slot
            const emptyBenchSlot = currentPlayer?.bench?.findIndex(slot => !slot);
            if (emptyBenchSlot !== undefined && emptyBenchSlot >= 0) {
              // Move unit from battlefield to bench
              const updatedBench = [...(currentPlayer.bench || [])];
              const updatedBattlefield = [...(currentPlayer.battlefield || [])];
              updatedBench[emptyBenchSlot] = battlefieldUnit;
              updatedBattlefield[actionMenuIndex] = null;

              updateMatch({
                ...currentMatch,
                players: {
                  ...currentMatch.players,
                  [currentPlayerId]: {
                    ...currentPlayer,
                    bench: updatedBench,
                    battlefield: updatedBattlefield
                  }
                }
              });
            }
          }
        }
        break;
    }

    setShowActionMenu(false);
    setActionMenuCard(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { card } = event.active.data.current || {};
    if (card) {
      setDraggedCard(card);
      // audioManager.playRandom('cardPlace'); // Use existing sound
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !currentMatch) {
      setDraggedCard(null);
      return;
    }

    const fromData = active.data.current;
    const toData = over.data.current;

    if (!fromData || !toData || fromData.playerId !== currentPlayerId) {
      setDraggedCard(null);
      return;
    }

    const player = currentMatch.players[currentPlayerId];
    if (!player) {
      setDraggedCard(null);
      return;
    }

    const fromZone = fromData.fromZone;
    const toZone = toData.zone;
    const fromIndex = fromData.fromIndex;
    const toIndex = toData.index;

    // Case 1: Moving from bench to battlefield
    if (fromZone === 'bench' && toZone === 'battlefield') {
      const updatedBench = [...(player.bench || Array(6).fill(null))];
      const updatedBattlefield = [...(player.battlefield || Array(6).fill(null))];

      const unit = updatedBench[fromIndex];
      if (unit && !updatedBattlefield[toIndex]) {
        updatedBench[fromIndex] = null;
        updatedBattlefield[toIndex] = unit;

        updateMatch({
          players: {
            ...currentMatch.players,
            [currentPlayerId]: {
              ...player,
              bench: updatedBench,
              battlefield: updatedBattlefield
            }
          }
        });

        audioManager.playRandom('cardPlace');
      }
    }
    // Case 2: Reordering within same zone
    else if (fromZone === toZone) {
      const zone = fromZone === 'battlefield' ? 'battlefield' : 'bench';
      const updatedZone = [...(player[zone] || Array(6).fill(null))];

      // Swap positions
      const temp = updatedZone[fromIndex];
      updatedZone[fromIndex] = updatedZone[toIndex];
      updatedZone[toIndex] = temp;

      updateMatch({
        players: {
          ...currentMatch.players,
          [currentPlayerId]: {
            ...player,
            [zone]: updatedZone
          }
        }
      });

      audioManager.playRandom('cardPlace');
    }

    setDraggedCard(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-black overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Main Board Container */}
        <div className="relative h-screen flex">

          {/* Left Side - Player Nexus Area with Action Button */}
          <div className="w-32 flex flex-col justify-center items-center gap-4 p-4">
            <Nexus
              health={currentPlayer?.health || 30}
              maxHealth={currentPlayer?.maxHealth || 30}
              isPlayer={true}
              name="You"
            />

            {/* Smart Action Button */}
            {(() => {
              const canAttack = hasAttackToken && currentPlayer?.battlefield?.some(u => u);
              const hasUnitsOnBench = currentPlayer?.bench?.some(u => u);
              const isDefending = !isMyTurn && currentMatch.phase === 'combat_blocks';

              // Determine button state and action
              let buttonText = 'END TURN';
              let buttonColor = 'bg-green-600 hover:bg-green-500';
              let buttonIcon = null;
              let buttonAction = endTurn;
              let showButton = isMyTurn || isDefending;

              if (isDefending) {
                buttonText = 'BLOCK';
                buttonColor = 'bg-blue-600 hover:bg-blue-500';
                buttonIcon = <Shield className="w-4 h-4" />;
                buttonAction = () => {
                  updateMatch({
                    phase: 'combat_damage' as any,
                    combatState: {
                      ...(currentMatch.combatState || {}),
                      blockers: {}
                    }
                  });
                };
              } else if (currentMatch.phase === 'combat_damage' && isMyTurn) {
                buttonText = 'RESOLVE';
                buttonColor = 'bg-purple-600 hover:bg-purple-500 animate-pulse';
                buttonIcon = <Sparkles className="w-4 h-4" />;
                buttonAction = () => {
                  startCombat();
                  setTimeout(() => {
                    updateMatch({
                      phase: 'main' as any,
                      combatState: undefined
                    });
                  }, 1000);
                };
              } else if (currentMatch.phase === 'combat_declaration' && isMyTurn) {
                buttonText = 'COMMIT';
                buttonColor = 'bg-orange-600 hover:bg-orange-500';
                buttonIcon = <ChevronRight className="w-4 h-4" />;
                buttonAction = () => {
                  const attackers = currentPlayer?.battlefield
                    ?.map((unit, idx) => unit ? idx : -1)
                    .filter(idx => idx >= 0) || [];

                  updateMatch({
                    phase: 'combat_blocks' as any,
                    combatState: {
                      ...(currentMatch.combatState || {}),
                      attackers
                    }
                  });
                };
              } else if (currentMatch.phase === 'main' && canAttack && isMyTurn) {
                buttonText = 'ATTACK';
                buttonColor = 'bg-red-600 hover:bg-red-500';
                buttonIcon = <Sword className="w-4 h-4" />;
                buttonAction = () => {
                  updateMatch({
                    phase: 'combat_declaration' as any,
                    combatState: {
                      attackers: [],
                      blockers: {},
                      damage: {},
                      resolved: false
                    }
                  });
                };
              }

              if (!showButton) return null;

              return (
                <button
                  onClick={buttonAction}
                  className={cn(
                    "px-4 py-2 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 text-sm",
                    buttonColor
                  )}
                >
                  {buttonIcon}
                  {buttonText}
                </button>
              );
            })()}

            {/* Player Mana */}
            <div className="bg-black/60 rounded-lg p-2 border border-blue-400/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-white font-bold">
                  {currentPlayer?.fate || 0}/{currentPlayer?.maxFate || 0}
                </span>
              </div>
              {currentPlayer?.spellMana && currentPlayer.spellMana > 0 && (
                <div className="text-xs text-purple-400 mt-1">
                  +{currentPlayer.spellMana} spell
                </div>
              )}
            </div>

            {/* Attack Token */}
            {hasAttackToken && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-orange-500/20 rounded-full p-2 border-2 border-orange-500"
              >
                <Sword className="w-6 h-6 text-orange-400" />
              </motion.div>
            )}
          </div>

          {/* Center - Game Board */}
          <div className="flex-1 flex flex-col justify-center px-8">

            {/* Opponent Side */}
            <div className="mb-2">

              {/* Opponent Bench (Back Row) */}
              <div className="flex justify-center gap-3 mb-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <BoardSlot
                    key={`opp-bench-${idx}`}
                    card={null}
                    unit={opponentPlayer?.bench?.[idx]}
                    index={idx}
                    isPlayer={false}
                    zone="bench"
                    onCardClick={handleCardClick}
                    playerId={opponentId}
                  />
                ))}
              </div>

              {/* Opponent Battlefield (Combat Row) */}
              <div className="flex justify-center gap-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <BoardSlot
                    key={`opp-battle-${idx}`}
                    card={null}
                    unit={opponentPlayer?.battlefield?.[idx]}
                    index={idx}
                    isPlayer={false}
                    zone="battlefield"
                    onCardClick={handleCardClick}
                    playerId={opponentId}
                  />
                ))}
              </div>
            </div>

            {/* Combat Line / Middle Area */}
            <div className="h-12 relative flex items-center my-2">
              <div className="absolute inset-x-0 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-tarot-gold/50 to-transparent" />

              {/* Phase & Turn Indicator */}
              <div className="absolute right-0 px-4 py-1 bg-black/60 rounded-lg border border-tarot-gold/30">
                <div className="text-xs text-white/60">Turn {currentMatch.turn}</div>
                <div className="text-sm font-bold text-tarot-gold">
                  {currentMatch.phase.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Player Side */}
            <div className="mt-2">
              {/* Player Battlefield (Combat Row) */}
              <div className="flex justify-center gap-3 mb-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <BoardSlot
                    key={`player-battle-${idx}`}
                    card={null}
                    unit={currentPlayer?.battlefield?.[idx]}
                    index={idx}
                    isPlayer={true}
                    zone="battlefield"
                    onCardClick={handleCardClick}
                    playerId={currentPlayerId}
                  />
                ))}
              </div>

              {/* Player Bench (Back Row) */}
              <div className="flex justify-center gap-3 mb-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <BoardSlot
                    key={`player-bench-${idx}`}
                    card={null}
                    unit={currentPlayer?.bench?.[idx]}
                    index={idx}
                    isPlayer={true}
                    zone="bench"
                    onCardClick={handleCardClick}
                    playerId={currentPlayerId}
                  />
                ))}
              </div>

              {/* Player Hand area moved to corner */}
            </div>
          </div>

          {/* Right Side - Opponent Nexus Area */}
          <div className="w-32 flex flex-col justify-center items-center gap-4 p-4">
            <Nexus
              health={opponentPlayer?.health || 30}
              maxHealth={opponentPlayer?.maxHealth || 30}
              isPlayer={false}
              name={opponentPlayer?.name || "Opponent"}
            />

            {/* Opponent Mana */}
            <div className="bg-black/60 rounded-lg p-2 border border-red-400/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                <span className="text-white font-bold">
                  {opponentPlayer?.fate || 0}/{opponentPlayer?.maxFate || 0}
                </span>
              </div>
            </div>

            {/* Opponent Attack Token */}
            {currentMatch.attackTokenOwner === opponentId && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-red-500/20 rounded-full p-2 border-2 border-red-500"
              >
                <Sword className="w-6 h-6 text-red-400" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Enemy Hand - Top Left Corner (shifted right and down to be fully visible) */}
        <div
          className="absolute top-16 left-8 z-30"
          onMouseEnter={() => setEnemyHandExpanded(true)}
          onMouseLeave={() => setEnemyHandExpanded(false)}
        >
          <div className={cn(
            "relative transition-all duration-300",
            enemyHandExpanded ? "w-auto" : "w-32"
          )}>
            <div className={cn(
              "flex relative",
              enemyHandExpanded ? "gap-2" : ""
            )}>
              {opponentPlayer?.hand?.map((_, idx) => (
                <motion.div
                  key={idx}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    x: enemyHandExpanded ? 0 : idx * 45,
                    rotate: enemyHandExpanded ? 0 : idx * 2 - 5
                  }}
                  transition={{ delay: idx * 0.03, duration: 0.3 }}
                  className={cn(
                    "w-16 h-20 bg-gradient-to-br from-purple-800 to-purple-900",
                    "rounded-lg border border-purple-500/50 shadow-lg",
                    !enemyHandExpanded && idx > 0 && "absolute left-0"
                  )}
                  style={{
                    zIndex: opponentPlayer.hand.length - idx,
                    position: enemyHandExpanded ? 'relative' : idx === 0 ? 'relative' : 'absolute'
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center text-purple-300 text-xl">
                    ✦
                  </div>
                </motion.div>
              ))}
            </div>
            {!enemyHandExpanded && opponentPlayer?.hand?.length > 0 && (
              <div className="absolute -bottom-6 left-0 text-xs text-purple-400">
                {opponentPlayer.hand.length} cards
              </div>
            )}
          </div>
        </div>

        {/* Player Hand - Bottom Right Corner (larger, facing up) */}
        <div className="absolute bottom-6 right-6 z-30">
          <AnimatePresence>
            {playerHandExpanded && (
              <>
                {/* Backdrop that closes hand when clicked */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setPlayerHandExpanded(false)}
                />
                {/* Hand container - clicks inside won't close it */}
                <motion.div
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  className="fixed inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm z-50"
                >
                  <div className="flex justify-center items-end gap-4 h-full pb-6">
                    {currentPlayer?.hand?.map((card, idx) => (
                      <HandCard
                        key={card.id}
                        card={card}
                        idx={idx}
                        onCardClick={handleCardClick}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayerHandExpanded(false);
                    }}
                    className="absolute top-4 right-4 text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Stacked Hand Display */}
          {!playerHandExpanded && (
            <div
              className="relative cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setPlayerHandExpanded(true)}>
              <div className="flex relative" data-tutorial="hand">
                {currentPlayer?.hand?.slice(0, 5).map((card, idx) => (
                  <motion.div
                    key={card.id}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{
                      x: idx * -56,
                      opacity: 1,
                      rotate: 0
                    }}
                    transition={{ delay: idx * 0.03 }}
                    className={cn(
                      "relative w-28 h-40",
                      idx > 0 && "absolute"
                    )}
                    style={{ zIndex: currentPlayer.hand.length - idx }}
                  >
                    <TarotCard card={card} scale={0.8} isDraggable={false} />
                  </motion.div>
                ))}
                {currentPlayer?.hand?.length > 5 && (
                  <div className="absolute -top-2 -right-2 bg-tarot-gold text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    +{currentPlayer.hand.length - 5}
                  </div>
                )}
              </div>
              <div className="text-center mt-2 text-sm text-tarot-gold">
                {currentPlayer?.hand?.length || 0} cards
              </div>
            </div>
          )}
        </div>


        {/* Settings Button - raise z and spacing to avoid overlap */}
        <div className="absolute top-4 right-4 z-40">
          <GameMenu />
        </div>

        {/* Card Overlay */}
        <CardOverlay
          card={selectedCard}
          isOpen={showCardOverlay}
          onClose={() => setShowCardOverlay(false)}
        />

        {/* Card Action Menu */}
        <CardActionMenu
          card={actionMenuCard}
          zone={actionMenuZone}
          isOpen={showActionMenu}
          position={actionMenuPosition}
          onAction={handleCardAction}
          onClose={() => {
            setShowActionMenu(false);
            setActionMenuCard(null);
          }}
          playerMana={currentPlayer?.fate || 0}
          playerSpellMana={currentPlayer?.spellMana || 0}
          isMyTurn={isMyTurn}
          hasAttackToken={hasAttackToken}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {draggedCard && (
          <div className="pointer-events-none opacity-80">
            <TarotCard card={draggedCard} isDragging={true} scale={1} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}