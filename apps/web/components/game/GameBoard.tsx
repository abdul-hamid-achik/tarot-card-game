'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { Card, useGameStore } from '@/lib/store/gameStore';
import { TarotCard } from './TarotCard';
import { PlayerArea } from './PlayerArea';
import { OpponentArea } from './OpponentArea';
import { CenterBoard } from './CenterBoard';
import { TopBar } from './TopBar';
import { FateCounter } from './FateCounter';
import { TrialsDisplay } from './TrialsDisplay';
import { PixelButton } from '@/components/ui/pixel-button';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audio/AudioManager';

export function GameBoard() {
  const {
    currentMatch,
    draggedCard,
    setDraggedCard,
    playCard,
    endTurn,
    validDropZones
  } = useGameStore();

  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [showSpellStack, setShowSpellStack] = useState(false);

  useEffect(() => {
    // Preload common game sounds
    audioManager.preloadGameSounds();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current as Card;
    console.log('Drag started:', card?.name);
    if (card) {
      setDraggedCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended. Over:', over?.id, 'Data:', over?.data?.current);

    if (over && draggedCard) {
      // Check if this is a player slot (not opponent slot)
      const isPlayerSlot = over.data.current?.isPlayerSlot;
      const targetSlot = over.data.current?.slot;

      console.log('Drop attempt - isPlayerSlot:', isPlayerSlot, 'targetSlot:', targetSlot);

      if (isPlayerSlot && targetSlot !== undefined) {
        console.log('Dropping card on slot:', targetSlot, 'Card:', draggedCard.name);
        playCard(draggedCard, targetSlot);
      }
    }

    setDraggedCard(null);
  };

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-tarot-board-dark to-tarot-mystic-purple flex items-center justify-center">
        <div className="text-tarot-gold text-2xl animate-pulse">Preparing the Arcanum...</div>
      </div>
    );
  }

  const currentPlayerId = 'player1'; // This will come from auth/session
  const playerIds = Object.keys(currentMatch.players);
  const opponentId = playerIds.find(id => id !== currentPlayerId) || playerIds[1] || 'player2';
  const currentPlayer = currentMatch.players[currentPlayerId];
  const opponentPlayer = currentMatch.players[opponentId];
  const isMyTurn = currentMatch.activePlayer === currentPlayerId;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-b from-tarot-board-dark via-tarot-board-medium to-tarot-board-light overflow-hidden">
        {/* Background Effects - Mystical atmosphere */}
        <div className="fixed inset-0">
          {/* Table Background Texture */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'url(/api/ui/themes/pixel-pack/backgrounds/table_bg_03.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              imageRendering: 'auto'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
          <div className="absolute inset-0 bg-mystic-gradient opacity-30" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-tarot-mystic-purple rounded-full blur-3xl opacity-20 animate-glow-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-tarot-mystic-violet rounded-full blur-3xl opacity-20 animate-glow-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tarot-gold/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 h-screen flex flex-col">
          {/* Top Bar - 6% Height */}
          <div className="h-[6%] bg-black/30 backdrop-blur-sm border-b border-white/10">
            <TopBar
              matchId={currentMatch.matchId}
              turn={currentMatch.turn}
              phase={currentMatch.phase}
              turnTimer={currentMatch.turnTimer}
            />
          </div>

          {/* Opponent Area - 30% Height */}
          <div className="h-[30%] relative">
            <OpponentArea
              player={opponentPlayer}
              isActive={currentMatch.activePlayer === opponentId}
            />

            {/* Opponent Fate Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
              <FateCounter
                current={opponentPlayer?.fate || 0}
                max={opponentPlayer?.maxFate || 3}
                position="top"
                label="Fate"
              />
            </div>
          </div>

          {/* Center Board Area - 34% Height */}
          <div className="h-[34%] relative px-8">
            <CenterBoard
              playerBoard={currentPlayer?.board || []}
              opponentBoard={opponentPlayer?.board || []}
              phase={currentMatch.phase}
              isMyTurn={isMyTurn}
            />

            {/* Phase Indicator */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="text-white text-sm font-bold mb-1">Phase</div>
                <div className={cn(
                  "text-lg capitalize font-bold",
                  currentMatch.phase === 'main' ? "text-green-400" : "text-yellow-400"
                )}>
                  {currentMatch.phase}
                </div>
              </div>
            </div>

            {/* Turn Counter */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="text-white text-sm font-bold mb-1">Turn</div>
                <div className="text-cyan-400 text-2xl">{currentMatch.turn}</div>
              </div>
            </div>

            {/* Spell Stack */}
            <AnimatePresence>
              {showSpellStack && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-2"
                >
                  {/* Spell stack cards would go here */}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player Area - 30% Height */}
          <div className="h-[30%] relative">
            <PlayerArea
              player={currentPlayer}
              isActive={isMyTurn}
            />

            {/* Player Fate Counter */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
              <FateCounter
                current={currentPlayer?.fate || 0}
                max={currentPlayer?.maxFate || 3}
                position="bottom"
                label="Fate"
              />
            </div>

            {/* End Turn Button */}
            <div className="absolute bottom-8 right-8">
              <PixelButton
                size="lg"
                variant={isMyTurn ? "gold" : "default"}
                onClick={endTurn}
                disabled={!isMyTurn}
                className={cn(
                  isMyTurn && "animate-pulse"
                )}
              >
                {isMyTurn ? "END TURN" : "OPPONENT'S TURN"}
              </PixelButton>
            </div>

            {/* Trials Display - Positioned higher to not overlap with cards */}
            <div className="absolute top-1/2 left-8 transform -translate-y-1/2">
              <TrialsDisplay
                trials={currentPlayer?.trials || []}
                playerName="You"
              />
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {draggedCard && (
            <div style={{ pointerEvents: 'none' }}>
              <TarotCard
                card={draggedCard}
                isDragging={true}
                scale={1}
              />
            </div>
          )}
        </DragOverlay>

        {/* Oracle Eye (Blue Orb) */}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-32 h-32 bg-blue-500 rounded-full blur-xl"
          />
        </div>
      </div>
    </DndContext>
  );
}