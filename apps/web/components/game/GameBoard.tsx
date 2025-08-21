'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, DragOverEvent } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { Card, useGameStore } from '@/lib/store/gameStore';
import { TarotCard } from './TarotCard';
import { CardOverlay } from './CardOverlay';
import { GameMenu } from './GameMenu';
import { CardActionMenu } from './CardActionMenu';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audio/AudioManager';
import { gameLogger } from '@tarot/game-logger';

interface ZoneProps {
  id: string;
  cards: (Card | null)[];
  type: 'hand' | 'bench' | 'battlefield';
  isPlayer: boolean;
  maxCards: number;
  onCardClick?: (card: Card, event?: React.MouseEvent) => void;
  isValidDropZone?: boolean;
  className?: string;
}

function DropZone({ id, cards, type, isPlayer, maxCards, onCardClick, isValidDropZone, className }: ZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type, isPlayer }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-200",
        type === 'hand' && "flex gap-2 justify-center p-4",
        type === 'bench' && "grid grid-cols-6 gap-2 p-3",
        type === 'battlefield' && "grid grid-cols-6 gap-2 p-3",
        isValidDropZone && "ring-2 ring-tarot-gold/50",
        isOver && "bg-tarot-gold/10 scale-[1.02]",
        className
      )}
    >
      {/* Background pattern for zones */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full"
          style={{
            backgroundImage: type === 'battlefield'
              ? 'radial-gradient(circle at center, var(--tarot-gold) 1px, transparent 1px)'
              : 'linear-gradient(45deg, var(--tarot-mystic-purple) 25%, transparent 25%)',
            backgroundSize: type === 'battlefield' ? '20px 20px' : '10px 10px'
          }}
        />
      </div>

      {/* Zone Label */}
      <div className={cn(
        "absolute text-xs font-bold uppercase tracking-wider opacity-30",
        isPlayer ? "bottom-1 right-2" : "top-1 left-2"
      )}>
        {type === 'hand' ? 'The Spread' :
          type === 'bench' ? 'Reading Table' :
            'Manifestation'}
      </div>

      {/* Card Slots */}
      {type === 'hand' ? (
        cards.filter(Boolean).map((card, idx) => (
          <motion.div
            key={card?.id || idx}
            initial={{ opacity: 0, y: isPlayer ? 20 : -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={isPlayer ? { y: -20, scale: 1.05 } : undefined}
            onClick={(e) => card && onCardClick?.(card, e)}
            className="cursor-pointer relative"
          >
            {card && (
              <TarotCard card={card} scale={0.8} isDraggable={false} />
            )}
          </motion.div>
        ))
      ) : (
        Array.from({ length: maxCards }).map((_, idx) => {
          const card = cards[idx];
          return (
            <div
              key={idx}
              className={cn(
                "relative aspect-[2/3] rounded-lg border-2 transition-all",
                card ? "border-tarot-gold/30 bg-black/20" : "border-white/10 bg-black/10",
                type === 'battlefield' && "shadow-lg"
              )}
            >
              {card && (
                <motion.div
                  layoutId={card.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    // Only log significant card interactions, not every click
                    if (type === 'hand' || type === 'battlefield') {
                      gameLogger.logAction('card_interaction', {
                        cardId: card.id,
                        cardName: card.name,
                        zoneType: type,
                        slot: idx,
                        isPlayer: isPlayer
                      }, true, 'Card interaction in game board');
                    }
                    onCardClick?.(card);
                  }}
                  className="absolute inset-0 cursor-pointer"
                >
                  <TarotCard card={card} scale={1} />
                </motion.div>
              )}

              {/* Slot number indicator */}
              <div className="absolute bottom-1 right-1 text-xs opacity-20">
                {idx + 1}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

interface ArcanumProps {
  health: number;
  maxHealth: number;
  isPlayer: boolean;
  playerName: string;
}

function Arcanum({ health, maxHealth, isPlayer, playerName }: ArcanumProps) {
  const healthPercentage = (health / maxHealth) * 100;

  return (
    <div className={cn(
      "relative w-24 h-32 rounded-xl overflow-hidden",
      "bg-gradient-to-br from-tarot-mystic-purple to-tarot-mystic-violet",
      "border-2 border-tarot-gold/50 shadow-2xl",
      health <= 5 && "animate-pulse border-red-500"
    )}>
      {/* Arcanum Crystal Effect */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
          style={{
            backgroundImage: 'radial-gradient(circle at center, var(--tarot-gold) 1px, transparent 50%)',
            backgroundSize: '10px 10px'
          }}
        />
      </div>

      {/* Health Display */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-white drop-shadow-lg">
          {health}
        </div>
        <div className="text-xs text-white/70">
          ARCANUM
        </div>
      </div>

      {/* Health Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
        <motion.div
          className="h-full bg-gradient-to-r from-tarot-gold to-yellow-400"
          initial={{ width: '100%' }}
          animate={{ width: `${healthPercentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Player Name */}
      <div className={cn(
        "absolute text-xs font-bold text-white/70",
        isPlayer ? "-bottom-5 left-1/2 -translate-x-1/2" : "-top-5 left-1/2 -translate-x-1/2"
      )}>
        {playerName}
      </div>
    </div>
  );
}

export function GameBoard() {
  const {
    currentMatch,
    draggedCard,
    setDraggedCard,
    playCard,
    endTurn,
    validDropZones
  } = useGameStore();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardOverlay, setShowCardOverlay] = useState(false);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [actionMenuCard, setActionMenuCard] = useState<Card | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [showActionMenu, setShowActionMenu] = useState(false);

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-tarot-board-dark to-tarot-mystic-purple flex items-center justify-center">
        <div className="text-tarot-gold text-2xl animate-pulse">Consulting the Fates...</div>
      </div>
    );
  }

  const currentPlayerId = 'player1';
  const playerIds = Object.keys(currentMatch.players);
  const opponentId = playerIds.find(id => id !== currentPlayerId) || 'player2';
  const currentPlayer = currentMatch.players[currentPlayerId];
  const opponentPlayer = currentMatch.players[opponentId];
  const isMyTurn = currentMatch.activePlayer === currentPlayerId;

  const handleCardClick = (card: Card, event?: React.MouseEvent) => {
    // Only show action menu for cards in hand
    if (event && currentPlayer?.hand?.some(c => c.id === card.id)) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setActionMenuCard(card);
      setActionMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setShowActionMenu(true);
    } else {
      // For cards not in hand, just show the overlay
      setSelectedCard(card);
      setShowCardOverlay(true);
    }
  };

  const handlePlayCard = () => {
    if (actionMenuCard) {
      // Find first empty slot on bench
      const emptySlot = currentPlayer?.bench?.findIndex(slot => !slot);
      if (emptySlot !== undefined && emptySlot >= 0) {
        playCard(actionMenuCard, emptySlot);
        audioManager.playRandom('cardPlace');
      }
      setShowActionMenu(false);
      setActionMenuCard(null);
    }
  };

  const handleViewCard = () => {
    if (actionMenuCard) {
      setSelectedCard(actionMenuCard);
      setShowCardOverlay(true);
      setShowActionMenu(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current as Card;
    if (card) {
      setDraggedCard(card);
      audioManager.playRandom('cardPickup');
      // Only log drag start for meaningful interactions
      if (card.type !== 'unit') {
        gameLogger.logAction('card_drag_start', {
          cardId: card.id,
          cardName: card.name,
          cardType: card.type,
          playerId: 'player1'
        }, true, 'Player started dragging card');
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    setDragOverZone(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && draggedCard) {
      const dropData = over.data.current;

      if (dropData?.type === 'bench' && dropData?.isPlayer) {
        // Find first empty slot on bench
        const emptySlot = currentPlayer.bench?.findIndex(slot => !slot);
        if (emptySlot !== undefined && emptySlot >= 0) {
          playCard(draggedCard, emptySlot);
          audioManager.playRandom('cardPlace');
          // Only log successful plays for non-unit cards to reduce verbosity
          if (draggedCard.type !== 'unit') {
            gameLogger.logAction('card_play_success', {
              cardId: draggedCard.id,
              cardName: draggedCard.name,
              cardType: draggedCard.type,
              slot: emptySlot,
              playerId: 'player1'
            }, true, 'Card successfully played');
          }
        } else {
          gameLogger.logAction('card_play_failed', {
            cardId: draggedCard.id,
            cardName: draggedCard.name,
            reason: 'bench_full'
          }, false, 'Failed to play card - bench is full');
        }
      } else {
        gameLogger.logAction('card_play_failed', {
          cardId: draggedCard.id,
          cardName: draggedCard.name,
          reason: 'invalid_drop_zone',
          dropZone: dropData?.type
        }, false, 'Failed to play card - invalid drop zone');
      }
    } else {
      // Don't log cancelled drags to reduce noise - only log meaningful interactions
    }

    setDraggedCard(null);
    setDragOverZone(null);
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-b from-tarot-board-dark via-tarot-mystic-purple/20 to-tarot-board-dark overflow-hidden">
        {/* Game Menu */}
        <GameMenu />

        {/* Mystical Background Effects */}
        <div className="fixed inset-0">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-tarot-mystic-purple rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-tarot-mystic-violet rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
        </div>

        <div className="relative z-10 h-screen flex flex-col p-4">
          {/* Opponent Side */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Opponent Hand (hidden cards) */}
            <div className="h-20 bg-black/30 backdrop-blur-sm rounded-lg border border-white/10">
              <div className="flex justify-center items-center h-full gap-1">
                {opponentPlayer?.hand?.map((_, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-16 bg-gradient-to-br from-tarot-mystic-purple to-tarot-mystic-violet rounded border border-tarot-gold/30"
                  >
                    <div className="w-full h-full flex items-center justify-center text-tarot-gold/50">
                      ✦
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opponent Bench */}
            <div className="h-32 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10">
              <DropZone
                id="opponent-bench"
                cards={opponentPlayer?.bench || Array(6).fill(null)}
                type="bench"
                isPlayer={false}
                maxCards={6}
                onCardClick={handleCardClick}
              />
            </div>

            {/* Opponent Battlefield */}
            <div className="h-32 bg-gradient-to-b from-red-900/20 to-transparent rounded-lg border border-red-500/30">
              <DropZone
                id="opponent-battlefield"
                cards={opponentPlayer?.battlefield || Array(6).fill(null)}
                type="battlefield"
                isPlayer={false}
                maxCards={6}
                onCardClick={handleCardClick}
              />
            </div>
          </div>

          {/* Center Area - Combat Zone & Arcanums */}
          <div className="h-24 relative flex items-center justify-between px-8">
            {/* Combat Line */}
            <div className="absolute inset-x-0 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-tarot-gold/50 to-transparent" />

            {/* Player Arcanum (Nexus) */}
            <Arcanum
              health={currentPlayer?.nexusHealth || 20}
              maxHealth={20}
              isPlayer={true}
              playerName="You"
            />

            {/* Turn Indicator */}
            <div className="px-6 py-3 bg-black/50 backdrop-blur-sm rounded-xl border border-tarot-gold/30">
              <div className="text-center">
                <div className="text-xs text-white/50 mb-1">TURN {currentMatch.turn}</div>
                <div className={cn(
                  "text-lg font-bold",
                  isMyTurn ? "text-tarot-gold animate-pulse" : "text-white/30"
                )}>
                  {isMyTurn ? "YOUR FATE" : "OPPONENT'S FATE"}
                </div>
              </div>
            </div>

            {/* Opponent Arcanum */}
            <Arcanum
              health={opponentPlayer?.nexusHealth || 20}
              maxHealth={20}
              isPlayer={false}
              playerName="Opponent"
            />
          </div>

          {/* Player Side */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Player Battlefield */}
            <div className="h-32 bg-gradient-to-t from-blue-900/20 to-transparent rounded-lg border border-blue-500/30">
              <DropZone
                id="player-battlefield"
                cards={currentPlayer?.battlefield || Array(6).fill(null)}
                type="battlefield"
                isPlayer={true}
                maxCards={6}
                onCardClick={handleCardClick}
                isValidDropZone={validDropZones?.includes('battlefield')}
              />
            </div>

            {/* Player Bench */}
            <div className="h-32 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10">
              <DropZone
                id="player-bench"
                cards={currentPlayer?.bench || Array(6).fill(null)}
                type="bench"
                isPlayer={true}
                maxCards={6}
                onCardClick={handleCardClick}
                isValidDropZone={validDropZones?.includes('bench')}
              />
            </div>

            {/* Player Hand */}
            <div className="h-28 bg-black/30 backdrop-blur-sm rounded-lg border border-white/10">
              <DropZone
                id="player-hand"
                cards={currentPlayer?.hand || []}
                type="hand"
                isPlayer={true}
                maxCards={10}
                onCardClick={handleCardClick}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-8 right-8">
            {isMyTurn && (
              <button
                onClick={endTurn}
                className="px-6 py-3 bg-tarot-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-all"
              >
                END TURN
              </button>
            )}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {draggedCard && (
            <div className="pointer-events-none opacity-80">
              <TarotCard card={draggedCard} isDragging={true} scale={1} />
            </div>
          )}
        </DragOverlay>
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
        onView={handleViewCard}
        onClose={() => {
          setShowActionMenu(false);
          setActionMenuCard(null);
        }}
        canPlay={isMyTurn && ((currentPlayer?.fate || 0) + ((actionMenuCard?.type === 'spell' ? currentPlayer?.spellMana : 0) || 0)) >= (actionMenuCard?.cost || 0)}
        playerMana={currentPlayer?.fate || 0}
        playerSpellMana={currentPlayer?.spellMana || 0}
      />
    </DndContext>
  );
}