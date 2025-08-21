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

// Separate component for draggable hand cards to avoid hooks in loops
function DraggableHandCard({ card, idx, playerId, onCardClick }: { 
  card: Card; 
  idx: number; 
  playerId: string;
  onCardClick: (card: Card, event?: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-${card.id}`,
    data: { card, isFromHand: true, playerId }
  });
  
  const handleClick = (e: React.MouseEvent) => {
    // Only process click if not dragging
    if (!isDragging) {
      onCardClick(card, e);
    }
  };
  
  return (
    <motion.div
      key={card.id}
      ref={setNodeRef}
      initial={{ y: 20, opacity: 0 }}
      animate={{ 
        y: isDragging ? -20 : 0, 
        opacity: isDragging ? 0.5 : 1,
        x: transform?.x ?? 0,
        scale: isDragging ? 1.1 : 1
      }}
      transition={{ delay: idx * 0.05 }}
      whileHover={{ y: -10, scale: 1.05 }}
      className="cursor-grab active:cursor-grabbing"
      onClick={handleClick}
      {...attributes}
      {...listeners}
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
  onCardClick?: (card: Card, event?: React.MouseEvent) => void;
  playerId: string;
}

function BoardSlot({ card, unit, index, isPlayer, zone, onCardClick, playerId }: BoardSlotProps) {
  const actualCard = unit?.card || card;
  const slotId = `${playerId}-${zone}-${index}`;

  // Make slots droppable
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { zone, index, playerId }
  });

  // Make cards draggable (only player's own cards)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: actualCard?.id || slotId,
    data: { card: actualCard, fromZone: zone, fromIndex: index, playerId },
    disabled: !isPlayer || !actualCard
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative w-[100px] h-[140px] rounded-lg transition-all",
        "border-2",
        actualCard ? "border-tarot-gold/30" : "border-white/10",
        zone === 'battlefield' && "shadow-lg",
        isOver && "border-tarot-gold bg-tarot-gold/10 scale-105",
        isDragging && "opacity-50"
      )}
    >
      {actualCard && (
        <motion.div
          ref={isPlayer ? setDragRef : undefined}
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
            isPlayer ? "cursor-move" : "cursor-pointer"
          )}
          onClick={(e) => {
            // Click will only fire if drag hasn't started due to delay
            onCardClick?.(actualCard, e);
          }}
          {...(isPlayer ? attributes : {})}
          {...(isPlayer ? listeners : {})}
        >
          <TarotCard card={actualCard} scale={0.95} isDraggable={false} />
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
  const { currentMatch, playCard, endTurn, updateMatch } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardOverlay, setShowCardOverlay] = useState(false);
  const [actionMenuCard, setActionMenuCard] = useState<Card | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);

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

  const handleCardClick = (card: Card, event?: React.MouseEvent) => {
    if (event && currentPlayer?.hand?.some(c => c.id === card.id)) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setActionMenuCard(card);
      setActionMenuPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setShowActionMenu(true);
    } else {
      setSelectedCard(card);
      setShowCardOverlay(true);
    }
  };

  const handlePlayCard = () => {
    if (actionMenuCard) {
      const emptySlot = currentPlayer?.bench?.findIndex(slot => !slot);
      if (emptySlot !== undefined && emptySlot >= 0) {
        playCard(actionMenuCard, emptySlot);
        audioManager.playRandom('cardPlace');
      }
      setShowActionMenu(false);
      setActionMenuCard(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { card } = event.active.data.current || {};
    if (card) {
      setDraggedCard(card);
      audioManager.playRandom('cardPickup');
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

    // Check if dragging from hand to bench
    if (fromData?.isFromHand && toData?.zone === 'bench' && toData?.playerId === currentPlayerId) {
      const card = fromData.card;
      const toIndex = toData.index;

      // Check if player has enough mana
      if ((currentPlayer?.fate || 0) < card.cost) {
        setDraggedCard(null);
        return;
      }

      // Play the card to the specific bench slot
      playCard(card, toIndex);
      audioManager.playRandom('cardPlace');
      setDraggedCard(null);
      return;
    }

    // Only allow rearranging within the same player's zones
    if (fromData?.playerId !== toData?.playerId || fromData?.playerId !== currentPlayerId) {
      setDraggedCard(null);
      return;
    }

    const player = currentMatch.players[currentPlayerId];
    if (!player) {
      setDraggedCard(null);
      return;
    }

    // Get the zones
    const fromZone = fromData.fromZone;
    const toZone = toData.zone;
    const fromIndex = fromData.fromIndex;
    const toIndex = toData.index;

    // Allow movement between bench and battlefield
    const validZones = ['bench', 'battlefield'];
    if (!validZones.includes(fromZone) || !validZones.includes(toZone)) {
      setDraggedCard(null);
      return;
    }

    // Create updated zones
    const updatedBench = [...(player.bench || Array(6).fill(null))];
    const updatedBattlefield = [...(player.battlefield || Array(6).fill(null))];

    // Handle the move
    if (fromZone === toZone) {
      // Same zone - swap positions for reordering
      const zone = fromZone === 'bench' ? updatedBench : updatedBattlefield;
      const temp = zone[fromIndex];
      zone[fromIndex] = zone[toIndex];
      zone[toIndex] = temp;
    } else {
      // Different zones - move card from bench to battlefield or vice versa
      const sourceZone = fromZone === 'bench' ? updatedBench : updatedBattlefield;
      const targetZone = toZone === 'bench' ? updatedBench : updatedBattlefield;
      
      // Get the units
      const movingUnit = sourceZone[fromIndex];
      const targetUnit = targetZone[toIndex];
      
      // If target slot is empty, just move
      if (!targetUnit) {
        targetZone[toIndex] = movingUnit;
        sourceZone[fromIndex] = null;
      } else {
        // If target slot is occupied, swap
        sourceZone[fromIndex] = targetUnit;
        targetZone[toIndex] = movingUnit;
      }
    }

    // Update the match state
    updateMatch({
      ...currentMatch,
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
              {/* Opponent Hand (Hidden) */}
              <div className="flex justify-center gap-1 mb-2 h-16">
                {opponentPlayer?.hand?.map((_, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="w-12 h-16 bg-gradient-to-br from-purple-800 to-purple-900 rounded border border-purple-500/50 shadow-lg"
                  >
                    <div className="w-full h-full flex items-center justify-center text-purple-300">
                      ✦
                    </div>
                  </motion.div>
                ))}
              </div>

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

              {/* Player Hand */}
              <div className="flex justify-center gap-2 mt-4">
                {currentPlayer?.hand?.map((card, idx) => (
                  <DraggableHandCard
                    key={card.id}
                    card={card}
                    idx={idx}
                    playerId={currentPlayerId}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
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

        {/* End Turn Button */}
        {isMyTurn && (
          <button
            onClick={endTurn}
            className="absolute bottom-8 right-48 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all"
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
          isOpen={showActionMenu}
          position={actionMenuPosition}
          onPlay={handlePlayCard}
          onView={() => {
            if (actionMenuCard) {
              setSelectedCard(actionMenuCard);
              setShowCardOverlay(true);
              setShowActionMenu(false);
            }
          }}
          onClose={() => {
            setShowActionMenu(false);
            setActionMenuCard(null);
          }}
          canPlay={isMyTurn && ((currentPlayer?.fate || 0) >= (actionMenuCard?.cost || 0))}
          playerMana={currentPlayer?.fate || 0}
          playerSpellMana={currentPlayer?.spellMana || 0}
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