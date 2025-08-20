'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { Card, useGameStore } from '@/lib/store/gameStore';
import { useGameStateMachine } from '@/hooks/useGameStateMachine';
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
import { gameLogger } from '@/lib/logging/game-logger';
import { GameLogViewer, DebugToggle } from '@/components/debug/GameLogViewer';

export function GameBoardFSM() {
  const {
    currentMatch,
    draggedCard,
    setDraggedCard,
    validDropZones
  } = useGameStore();

  // Initialize FSM for proper game flow
  const {
    gameState,
    context,
    isMyPriority,
    canAttack,
    canBlock,
    isDefender,
    hasSpellsOnStack,
    playUnit,
    playSpell,
    declareAttack,
    declareBlockers,
    pass,
    startRound
  } = useGameStateMachine(
    currentMatch?.matchId || 'match-1',
    currentMatch ? Object.keys(currentMatch.players) : ['player1', 'ai'],
    currentMatch?.currentPlayerId || 'player1'
  );

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardOverlay, setShowCardOverlay] = useState(false);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [showBlockingUI, setShowBlockingUI] = useState(false);
  const [selectedAttackers, setSelectedAttackers] = useState<string[]>([]);
  const [blockerAssignments, setBlockerAssignments] = useState<Record<string, string>>({});

  // Get current player data
  const currentPlayerId = currentMatch?.currentPlayerId || 'player1';
  const currentPlayer = currentMatch?.players[currentPlayerId];
  const opponentId = Object.keys(currentMatch?.players || {}).find(id => id !== currentPlayerId) || 'ai';
  const opponentPlayer = currentMatch?.players[opponentId];

  useEffect(() => {
    // Preload game sounds
    audioManager.preloadGameSounds();
    
    // Set up game logging context
    if (currentMatch) {
      gameLogger.setContext({
        matchId: currentMatch.matchId,
        turn: context.round,
        phase: String(gameState)
      });
    }
  }, [currentMatch, context.round, gameState]);

  const handleCardClick = (card: Card) => {
    requestAnimationFrame(() => {
      setSelectedCard(card);
      setShowCardOverlay(true);
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current as Card;
    if (card) {
      gameLogger.logAction('drag_start', {
        cardId: card.id,
        cardName: card.name
      });
      setDraggedCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    
    if (over && draggedCard) {
      const isPlayerSlot = over.data.current?.isPlayerSlot;
      const targetSlot = over.data.current?.slot;

      // Check priority before allowing play
      if (!isMyPriority) {
        gameLogger.logAction('play_denied_no_priority', {
          card: draggedCard.name,
          priority: context.priorityPlayer
        }, false);
        audioManager.play('error');
        setDraggedCard(null);
        return;
      }

      if (isPlayerSlot && targetSlot !== undefined) {
        // Play the card using FSM
        if (draggedCard.type === 'unit') {
          const success = playUnit(draggedCard);
          if (success) {
            audioManager.playRandom('cardPlace');
          }
        } else if (draggedCard.type === 'spell') {
          const success = playSpell(draggedCard);
          if (success) {
            audioManager.play('spell');
          }
        }
      }
    }
    
    setDraggedCard(null);
  };

  const handleAttackDeclaration = () => {
    if (selectedAttackers.length === 0) {
      gameLogger.logAction('no_attackers_selected', {}, false);
      return;
    }

    declareAttack(selectedAttackers);
    setSelectedAttackers([]);
    audioManager.play('combat');
  };

  const handleBlockerAssignment = () => {
    declareBlockers(blockerAssignments);
    setBlockerAssignments({});
    setShowBlockingUI(false);
    audioManager.play('block');
  };

  const renderPriorityIndicator = () => (
    <div className={cn(
      "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
      "bg-black/90 backdrop-blur-lg rounded-2xl p-6 border-2",
      isMyPriority ? "border-green-400 shadow-green-glow" : "border-red-400 shadow-red-glow",
      "transition-all duration-300 animate-in fade-in zoom-in-95"
    )}>
      <div className="text-white text-lg font-bold mb-2">
        {isMyPriority ? "Your Priority" : "Opponent's Priority"}
      </div>
      <div className="text-sm text-gray-300">
        {isDefender && "You are defending this round"}
        {canAttack && "You can attack this round"}
      </div>
    </div>
  );

  const renderSpellStack = () => (
    <AnimatePresence>
      {hasSpellsOnStack && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-purple-900/90 backdrop-blur-lg rounded-xl p-4 border-2 border-purple-400">
            <div className="text-white font-bold mb-2">Spell Stack</div>
            <div className="flex gap-2">
              {context.spellStack.map((spell, index) => (
                <div key={spell.id} className="bg-purple-800 rounded p-2">
                  <div className="text-xs text-white">{spell.card.name}</div>
                  <div className="text-xs text-purple-300">{spell.card.spellSpeed}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderActionButtons = () => (
    <div className="absolute bottom-8 right-8 flex gap-3 z-40">
      {/* Pass button - always show when you have priority */}
      {isMyPriority && (
        <PixelButton
          size="lg"
          variant="gold"
          onClick={() => {
            pass();
            audioManager.playRandom('turnChange');
          }}
          className={cn(
            "transition-all",
            context.consecutivePasses > 0 && "animate-pulse ring-2 ring-yellow-400"
          )}
        >
          {context.consecutivePasses > 0 ? "PASS (End Round)" : "PASS"}
        </PixelButton>
      )}

      {/* Attack button */}
      {canAttack && !context.combatDeclared && (
        <PixelButton
          size="lg"
          variant="red"
          onClick={() => {
            // Show attacker selection UI
            const units = currentPlayer?.board?.filter((slot: any) => 
              slot.card && !slot.card.hasAttacked
            ) || [];
            
            if (units.length > 0) {
              // For now, select all available attackers
              const attackerIds = units.map((slot: any) => slot.card.id);
              declareAttack(attackerIds);
              audioManager.play('combat');
            }
          }}
          className="animate-bounce shadow-red-glow"
        >
          ⚔️ ATTACK
        </PixelButton>
      )}

      {/* Block button */}
      {canBlock && (
        <PixelButton
          size="lg"
          variant="blue"
          onClick={() => setShowBlockingUI(true)}
          className="animate-pulse shadow-blue-glow"
        >
          🛡️ ASSIGN BLOCKERS
        </PixelButton>
      )}

      {/* Round start (for round transitions) */}
      {String(gameState).includes('roundEnd') && (
        <PixelButton
          size="md"
          variant="green"
          onClick={() => {
            startRound();
            audioManager.play('roundStart');
          }}
        >
          NEW ROUND
        </PixelButton>
      )}
    </div>
  );

  const renderGameStateIndicator = () => (
    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50">
      <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 border-2 border-white/30 shadow-2xl">
        <div className="text-white text-xs font-bold mb-1">ROUND {context.round}</div>
        <div className={cn(
          "text-xl capitalize font-bold text-center",
          String(gameState).includes('action') ? "text-green-400" :
          String(gameState).includes('combat') ? "text-red-400" :
          String(gameState).includes('roundStart') ? "text-blue-400" :
          "text-yellow-400"
        )}>
          {String(gameState).split('.').pop()?.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        
        <div className="mt-2 space-y-1">
          <div className={cn(
            "text-xs",
            isMyPriority ? "text-green-300" : "text-red-300"
          )}>
            Priority: {isMyPriority ? "You" : "Opponent"}
          </div>
          <div className={cn(
            "text-xs",
            context.attackTokenOwner === currentPlayerId ? "text-amber-300" : "text-gray-400"
          )}>
            Attack Token: {context.attackTokenOwner === currentPlayerId ? "You" : "Opponent"}
          </div>
          {hasSpellsOnStack && (
            <div className="text-purple-300 text-xs animate-pulse">
              Stack: {context.spellStack.length} spells
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!currentMatch) {
    return <div>Loading match...</div>;
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-b from-tarot-board-dark via-tarot-board-medium to-tarot-board-light overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
          <div className="absolute inset-0 bg-mystic-gradient opacity-30" />
        </div>

        <div className="relative z-10 h-screen flex flex-col">
          {/* Top Bar */}
          <div className="h-[6%] bg-black/30 backdrop-blur-sm border-b border-white/10">
            <TopBar matchId={currentMatch.matchId} />
          </div>

          {/* Opponent Area */}
          <div className="h-[30%] relative">
            <OpponentArea
              player={opponentPlayer}
              isActive={!isMyPriority}
              isAttacker={context.attackTokenOwner === opponentId}
            />
          </div>

          {/* Center Board */}
          <div className="h-[34%] relative px-8">
            <CenterBoard
              playerBoard={currentPlayer?.board || []}
              opponentBoard={opponentPlayer?.board || []}
              phase={String(gameState)}
              isMyTurn={isMyPriority}
              onCardClick={handleCardClick}
            />
            
            {renderGameStateIndicator()}
            {renderSpellStack()}
          </div>

          {/* Player Area */}
          <div className="h-[30%] relative">
            <PlayerArea
              player={currentPlayer}
              isActive={isMyPriority}
              onCardClick={handleCardClick}
            />
            
            {/* Mana Display */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
              <div className="flex gap-4">
                <FateCounter
                  current={context.mana[currentPlayerId] || 0}
                  max={context.maxMana[currentPlayerId] || 0}
                  position="bottom"
                  label="Mana"
                />
                {(context.spellMana[currentPlayerId] || 0) > 0 && (
                  <FateCounter
                    current={context.spellMana[currentPlayerId] || 0}
                    max={3}
                    position="bottom"
                    label="Spell"
                  />
                )}
              </div>
            </div>
            
            {renderActionButtons()}
          </div>
        </div>

        {/* Card Overlay */}
        <AnimatePresence>
          {showCardOverlay && selectedCard && (
            <CardOverlay
              card={selectedCard}
              onClose={() => {
                setShowCardOverlay(false);
                setSelectedCard(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Blocking UI Modal */}
        <AnimatePresence>
          {showBlockingUI && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
              onClick={() => setShowBlockingUI(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-gray-900 rounded-2xl p-8 max-w-4xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-white mb-4">Assign Blockers</h2>
                <div className="text-gray-300 mb-6">
                  Drag your units to block incoming attackers
                </div>
                {/* TODO: Implement blocking assignment UI */}
                <div className="flex gap-4">
                  <PixelButton onClick={handleBlockerAssignment}>
                    Confirm Blocks
                  </PixelButton>
                  <PixelButton variant="ghost" onClick={() => setShowBlockingUI(false)}>
                    No Blocks
                  </PixelButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedCard && (
            <div className="rotate-6 scale-110">
              <TarotCard
                card={draggedCard}
                size="medium"
                isDragging
              />
            </div>
          )}
        </DragOverlay>

        {/* Debug Log */}
        <DebugToggle show={showDebugLog} onToggle={() => setShowDebugLog(!showDebugLog)} />
        {showDebugLog && <GameLogViewer logs={[]} />}
      </div>
    </DndContext>
  );
}