'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
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
  onCardClick: (card: Card, zone: 'hand', event?: React.MouseEvent) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    onCardClick(card, 'hand', e);
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

  // Only battlefield cards can be dragged (for reordering)
  const canDrag = isPlayer && zone === 'battlefield' && actualCard;

  // Make slots droppable (only battlefield for reordering)
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { zone, index, playerId },
    disabled: zone !== 'battlefield'
  });

  // Make cards draggable (only in battlefield for reordering)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: actualCard?.id || slotId,
    data: { card: actualCard, fromZone: zone, fromIndex: index, playerId },
    disabled: !canDrag
  });

  // Different sizes for different zones
  const slotSize = zone === 'battlefield' 
    ? "w-[110px] h-[154px]"  // Bigger for battlefield (manifestation)
    : "w-[80px] h-[112px]";   // Smaller for bench (reading row)

  const cardScale = zone === 'battlefield' ? 1.0 : 0.75;

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

export function GameBoard() {
  const { currentMatch, playCard, endTurn, updateMatch, startCombat } = useGameStore();
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

    // Only allow reordering within battlefield
    if (!fromData || !toData || 
        fromData.fromZone !== 'battlefield' || 
        toData.zone !== 'battlefield' ||
        fromData.playerId !== currentPlayerId ||
        toData.playerId !== currentPlayerId) {
      setDraggedCard(null);
      return;
    }

    const player = currentMatch.players[currentPlayerId];
    if (!player) {
      setDraggedCard(null);
      return;
    }

    const fromIndex = fromData.fromIndex;
    const toIndex = toData.index;

    // Reorder battlefield cards
    const updatedBattlefield = [...(player.battlefield || Array(6).fill(null))];
    const temp = updatedBattlefield[fromIndex];
    updatedBattlefield[fromIndex] = updatedBattlefield[toIndex];
    updatedBattlefield[toIndex] = temp;

    // Update the match state
    updateMatch({
      ...currentMatch,
      players: {
        ...currentMatch.players,
        [currentPlayerId]: {
          ...player,
          battlefield: updatedBattlefield
        }
      }
    });

    audioManager.playRandom('cardPlace');
    setDraggedCard(null);
  };

  return (
    <DndContext 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
      activationConstraint={{
        delay: 200,
        tolerance: 5
      }}
    >
      <div className="relative min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-black overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Main Board Container */}
        <div className="relative h-screen flex">

          {/* Left Side - Player Nexus Area */}
          <div className="w-32 flex flex-col justify-center items-center gap-4 p-4">
            <Nexus
              health={currentPlayer?.health || 30}
              maxHealth={currentPlayer?.maxHealth || 30}
              isPlayer={true}
              name="You"
            />

            {/* Player Mana */}
            <div className="bg-black/60 rounded-lg p-2 border border-blue-400/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-white font-bold">
                  {currentPlayer?.fate || 0}/{currentPlayer?.maxFate || 0}
                </span>
              </div>
              {currentPlayer?.spellMana > 0 && (
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
              <div className="flex justify-center gap-2 mb-1">
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
              <div className="flex justify-center gap-2">
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
              <div className="flex justify-center gap-2 mb-1">
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
              <div className="flex justify-center gap-2 mb-2">
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

        {/* Enemy Hand - Top Left Corner */}
        <div 
          className="absolute top-4 left-4 z-40"
          onMouseEnter={() => setEnemyHandExpanded(true)}
          onMouseLeave={() => setEnemyHandExpanded(false)}
        >
          <div className={cn(
            "relative transition-all duration-300",
            enemyHandExpanded ? "w-auto" : "w-24"
          )}>
            <div className={cn(
              "flex",
              enemyHandExpanded ? "gap-2" : "gap-0"
            )}>
              {opponentPlayer?.hand?.map((_, idx) => (
                <motion.div
                  key={idx}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    x: enemyHandExpanded ? 0 : idx * -35,
                    rotate: enemyHandExpanded ? 0 : idx * -2 + 5
                  }}
                  transition={{ delay: idx * 0.03, duration: 0.3 }}
                  className={cn(
                    "relative w-16 h-20 bg-gradient-to-br from-purple-800 to-purple-900",
                    "rounded-lg border border-purple-500/50 shadow-lg",
                    !enemyHandExpanded && idx > 0 && "absolute"
                  )}
                  style={{ zIndex: idx }}
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

        {/* Player Hand - Bottom Right Corner */}
        <div 
          className="absolute bottom-4 right-4 z-40"
          onClick={() => setPlayerHandExpanded(!playerHandExpanded)}
        >
          <AnimatePresence>
            {playerHandExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm z-50"
              >
                <div className="flex justify-center items-end gap-3 h-full pb-4">
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
            )}
          </AnimatePresence>

          {/* Stacked Hand Display */}
          {!playerHandExpanded && (
            <div className="relative cursor-pointer hover:scale-105 transition-transform">
              <div className="flex relative">
                {currentPlayer?.hand?.slice(0, 5).map((card, idx) => (
                  <motion.div
                    key={card.id}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ 
                      x: idx * -40,
                      opacity: 1,
                      rotate: idx * 2 - 4
                    }}
                    transition={{ delay: idx * 0.03 }}
                    className={cn(
                      "relative w-20 h-28",
                      idx > 0 && "absolute"
                    )}
                    style={{ zIndex: currentPlayer.hand.length - idx }}
                  >
                    <TarotCard card={card} scale={0.5} isDraggable={false} />
                  </motion.div>
                ))}
                {currentPlayer?.hand?.length > 5 && (
                  <div className="absolute -top-2 -right-2 bg-tarot-gold text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    +{currentPlayer.hand.length - 5}
                  </div>
                )}
              </div>
              <div className="text-center mt-2 text-xs text-tarot-gold">
                {currentPlayer?.hand?.length || 0} cards
              </div>
            </div>
          )}
        </div>

        {/* End Turn Button */}
        {isMyTurn && (
          <button
            onClick={endTurn}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all"
          >
            END TURN
          </button>
        )}

        {/* Settings Button */}
        <div className="absolute top-4 right-4">
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