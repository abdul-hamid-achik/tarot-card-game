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
import { CardOverlay } from './CardOverlay';
import { PixelButton } from '@/components/ui/pixel-button';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audio/AudioManager';
import { gameLogger } from '@tarot/game-logger';
import { GameLogViewer, DebugToggle } from '@/components/debug/GameLogViewer';

export function GameBoard() {
  const {
    currentMatch,
    draggedCard,
    setDraggedCard,
    playCard,
    startCombat,
    endTurn,
    validDropZones,
    updateMatchState
  } = useGameStore();

  // Helper function to check if player can take actions
  const canPlayerTakeActions = (player: any) => {
    if (!player) return false;

    // Check if player has fate (mana) remaining
    const hasMana = player.fate > 0;

    // Check if player has spell mana remaining
    const hasSpellMana = (player.spellMana || 0) > 0;

    // Check if player has any playable cards in hand
    const hasPlayableCards = player.hand?.some((card: any) =>
      card.cost <= (player.fate + (player.spellMana || 0))
    ) || false;

    // Check if player has any units on board that could perform actions
    const hasActiveUnits = player.board?.some((slot: any) =>
      slot.card && slot.card.type === 'unit'
    ) || false;

    return hasMana || hasSpellMana || hasPlayableCards || hasActiveUnits;
  };

  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [showSpellStack, setShowSpellStack] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardOverlay, setShowCardOverlay] = useState(false);
  const [showDebugLog, setShowDebugLog] = useState(false);

  useEffect(() => {
    // Preload common game sounds
    audioManager.preloadGameSounds();
    
    // Set up game logging context when match changes
    if (currentMatch) {
      gameLogger.setContext({
        matchId: currentMatch.matchId,
        turn: currentMatch.turn,
        phase: currentMatch.phase
      });
    }
  }, [currentMatch]);

  const handleCardClick = (card: Card) => {
    requestAnimationFrame(() => {
      setSelectedCard(card);
      setShowCardOverlay(true);
    });
  };

  const handleCloseOverlay = () => {
    requestAnimationFrame(() => {
      setShowCardOverlay(false);
      setSelectedCard(null);
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current as Card;
    requestAnimationFrame(() => {
      if (card) {
        gameLogger.logAction('drag_start', {
          cardId: card.id,
          cardName: card.name,
          cardType: card.type
        }, true);
        setDraggedCard(card);
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    requestAnimationFrame(() => {
      if (over && draggedCard) {
        // Check if this is a player slot (not opponent slot)
        const isPlayerSlot = over.data.current?.isPlayerSlot;
        const targetSlot = over.data.current?.slot;

        gameLogger.logAction('drag_end', {
          cardId: draggedCard.id,
          cardName: draggedCard.name,
          overId: over.id,
          isPlayerSlot,
          targetSlot
        }, true);

        if (isPlayerSlot && targetSlot !== undefined) {
          gameLogger.logAction('card_drop_success', {
            cardName: draggedCard.name,
            targetSlot
          }, true);
          playCard(draggedCard, targetSlot);
          audioManager.playRandom('cardPlace');
        } else {
          gameLogger.logAction('card_drop_invalid', {
            cardName: draggedCard.name,
            reason: !isPlayerSlot ? 'Not player slot' : 'Invalid slot'
          }, false);
        }
      } else {
        gameLogger.logAction('drag_end_no_target', {
          cardName: draggedCard?.name || 'unknown'
        });
      }

      setDraggedCard(null);
    });
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
  const hasAttackToken = currentMatch.attackTokenOwner === currentPlayerId;

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
                max={opponentPlayer?.maxFate || 1}
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
              onCardClick={handleCardClick}
            />

            {/* Phase Indicator - Made more prominent */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50">
              <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 border-2 border-white/30 shadow-2xl">
                <div className="text-white text-sm font-bold mb-2 text-center">CURRENT PHASE</div>
                <div className={cn(
                  "text-2xl capitalize font-bold text-center tracking-wide",
                  currentMatch.phase === 'main' ? "text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" :
                    currentMatch.phase === 'combat' ? "text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" :
                      currentMatch.phase === 'draw' ? "text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" :
                        "text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]"
                )}>
                  {currentMatch.phase}
                </div>
                <div className="text-white/70 text-xs mt-1 text-center">
                  {currentMatch.phase === 'main' ? 'Play cards & take actions' :
                    currentMatch.phase === 'combat' ? 'Units attack each other' :
                      currentMatch.phase === 'draw' ? 'Draw cards & prepare' :
                        'End phase & cleanup'}
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
              onCardClick={handleCardClick}
            />

            {/* Player Fate Counter */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
              <FateCounter
                current={currentPlayer?.fate || 0}
                max={currentPlayer?.maxFate || 1}
                position="bottom"
                label="Fate"
              />
            </div>

            {/* Action Buttons - Proper phase-based logic */}
            <div className="absolute bottom-8 right-8 flex gap-3">
              {isMyTurn ? (
                <>
                  {currentMatch.phase === 'draw' && (
                    <PixelButton
                      size="lg"
                      variant="blue"
                      onClick={() => {
                        gameLogger.logAction('continue_to_main', {
                          playerId: currentPlayerId,
                          phase: currentMatch.phase
                        }, true);
                        endTurn(); // This will transition from draw to main
                        audioManager.playRandom('turnChange');
                      }}
                      className="animate-pulse"
                    >
                      CONTINUE
                    </PixelButton>
                  )}

                  {currentMatch.phase === 'main' && (
                    <PixelButton
                      size="lg"
                      variant="gold"
                      onClick={() => {
                        gameLogger.logAction('end_turn_button', {
                          playerId: currentPlayerId,
                          phase: currentMatch.phase,
                          canTakeActions: canPlayerTakeActions(currentPlayer)
                        }, true);
                        endTurn();
                        audioManager.playRandom('turnChange');
                      }}
                      className="animate-pulse"
                    >
                      {canPlayerTakeActions(currentPlayer) ? "PASS TURN" : "END TURN"}
                    </PixelButton>
                  )}

                  {currentMatch.phase === 'combat' && hasAttackToken && (
                    <>
                      <PixelButton
                        size="lg"
                        variant="red"
                        onClick={() => {
                          gameLogger.logAction('combat_button', {
                            playerId: currentPlayerId,
                            hasAttackToken
                          }, true);
                          startCombat();
                          audioManager.playRandom('turnChange');
                        }}
                        className="animate-pulse"
                      >
                        RESOLVE COMBAT
                      </PixelButton>
                      <PixelButton
                        size="md"
                        variant="default"
                        onClick={() => {
                          gameLogger.logAction('skip_combat', {
                            playerId: currentPlayerId
                          }, true);
                          // Skip to end phase without combat
                          updateMatchState({
                            phase: 'end'
                          });
                        }}
                      >
                        SKIP COMBAT
                      </PixelButton>
                    </>
                  )}

                  {currentMatch.phase === 'combat' && !hasAttackToken && (
                    <PixelButton
                      size="lg"
                      variant="gold"
                      onClick={() => {
                        gameLogger.logAction('end_turn_no_attack_token', {
                          playerId: currentPlayerId
                        }, true);
                        endTurn();
                        audioManager.playRandom('turnChange');
                      }}
                    >
                      END TURN
                    </PixelButton>
                  )}

                  {currentMatch.phase === 'end' && (
                    <PixelButton
                      size="lg"
                      variant="green"
                      onClick={() => {
                        gameLogger.logAction('start_new_turn', {
                          playerId: currentPlayerId,
                          phase: currentMatch.phase
                        }, true);
                        endTurn(); // This will transition from end to draw (new turn)
                        audioManager.playRandom('turnChange');
                      }}
                      className="animate-pulse"
                    >
                      START NEW TURN
                    </PixelButton>
                  )}
                </>
              ) : (
                <PixelButton
                  size="lg"
                  variant="default"
                  disabled={true}
                >
                  OPPONENT'S TURN
                </PixelButton>
              )}
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

      {/* Card Overlay */}
      <CardOverlay
        card={selectedCard}
        isOpen={showCardOverlay}
        onClose={handleCloseOverlay}
      />

      {/* Debug Components */}
      <GameLogViewer
        isVisible={showDebugLog}
        onToggle={() => setShowDebugLog(false)}
        maxEvents={100}
      />
      
      <DebugToggle
        isVisible={showDebugLog}
        onToggle={() => setShowDebugLog(!showDebugLog)}
      />
    </DndContext>
  );
}