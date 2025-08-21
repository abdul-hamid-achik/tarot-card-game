'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { TarotCard } from './TarotCard';
import { BoardSlot, GamePhase, Card, useGameStore } from '@/lib/store/gameStore';
import { Swords, Zap, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

interface CenterBoardProps {
  playerBoard: BoardSlot[];
  opponentBoard: BoardSlot[];
  phase: GamePhase;
  isMyTurn: boolean;
  onCardClick?: (card: Card) => void;
  // Attack selection helpers
  selectingAttackers?: boolean;
  selectedAttackerIds?: string[];
  onToggleAttacker?: (cardId: string) => void;
}

interface BoardSlotComponentProps {
  slot: BoardSlot;
  index: number;
  isPlayerSlot: boolean;
  canDrop: boolean;
  onCardClick?: (card: Card) => void;
  destroyedCards?: Set<string>;
}

function BoardSlotComponent({ slot, index, isPlayerSlot, canDrop, onCardClick, destroyedCards }: BoardSlotComponentProps) {
  const droppableId = `slot-${isPlayerSlot ? 'player' : 'opponent'}-${index}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { slot: index, isPlayerSlot },
    disabled: !canDrop
  });

  const blocked = slot.isBlocked || !canDrop;
  const isCardDestroyed = slot.card && destroyedCards?.has(slot.card.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative w-[150px] h-[210px] rounded-lg border-2 transition-all duration-200 z-10",
        slot.card
          ? "border-transparent"
          : canDrop
            ? "border-dashed border-green-400/50 bg-green-900/20"
            : "border-dashed border-white/20 bg-black/20",
        isOver && canDrop && "border-yellow-400 bg-yellow-400/20 scale-105 shadow-xl",
        blocked && "opacity-50 cursor-not-allowed"
      )}
      data-testid={isPlayerSlot ? `player-slot-${index}` : `opponent-slot-${index}`}
    >
      <AnimatePresence mode="wait">
        {slot.card && !isCardDestroyed ? (
          <motion.div
            key={slot.card.id}
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 45 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            data-testid={`board-card-${slot.card.id}`}
          >
            <TarotCard
              card={slot.card}
              isOnBoard={true}
              isSelectable={true}
              onClick={() => onCardClick?.(slot.card!)}
            />
          </motion.div>
        ) : slot.card && isCardDestroyed ? (
          <motion.div
            key={`${slot.card.id}-destroyed`}
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.5, 0] }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="w-full h-full bg-red-500/20 rounded-md flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 0] }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <div className="text-red-400 text-4xl">💀</div>
            </motion.div>
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white/20 text-6xl">
              {index + 1}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Attack Lane Indicator */}
      {slot.card && !isCardDestroyed && isPlayerSlot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2"
        >
          <Swords className="w-6 h-6 text-red-400" />
        </motion.div>
      )}
    </div>
  );
}

export function CenterBoard({ playerBoard, opponentBoard, phase, isMyTurn, onCardClick, selectingAttackers = false, selectedAttackerIds = [], onToggleAttacker }: CenterBoardProps) {
  const { currentMatch } = useGameStore();
  // Ensure we always have 6 slots
  const playerSlots: BoardSlot[] = Array.from({ length: 6 }, (_, i) =>
    playerBoard[i] || { card: null, position: i }
  );
  const opponentSlots: BoardSlot[] = Array.from({ length: 6 }, (_, i) =>
    opponentBoard[i] || { card: null, position: i }
  );

  const showCombatLines = phase === 'combat';
  const reactionOpen = !!currentMatch?.reactionWindow?.active;
  const canPlayUnits = isMyTurn && phase === 'main' && !reactionOpen;

  // Track destroyed cards for animation
  const [destroyedCards, setDestroyedCards] = useState<Set<string>>(new Set());

  // Calculate which cards will be destroyed based on combat (LoR-style pairing by order)
  const calculateDestroyedCards = () => {
    if (!showCombatLines) return new Set<string>();

    const destroyed = new Set<string>();
    const attackerId = currentMatch?.activePlayer;
    const playerIds = currentMatch ? Object.keys(currentMatch.players) : [];
    const defenderId = playerIds.find(id => id !== attackerId) || attackerId;

    if (!attackerId || !defenderId || !currentMatch) return destroyed;

    const attacker = currentMatch.players[attackerId];
    const defender = currentMatch.players[defenderId];

    if (!attacker || !defender) return destroyed;

    // Helper function for suit bonus calculation
    const suitBonus = (atkSuit: string, defSuit: string): number => {
      if (atkSuit === 'major' || defSuit === 'major') return 0;
      if (atkSuit === defSuit) return -1;
      if (atkSuit === 'wands' && defSuit === 'cups') return 1;
      if (atkSuit === 'swords' && defSuit === 'pentacles') return 1;
      return 0;
    };

    const effectivePower = (card: Card | null | undefined, enemy: Card | null | undefined): number => {
      if (!card) return 0;
      const base = Math.max(0, card.attack || 0);
      const orientationBonus = card.orientation === 'upright' ? 1 : 0;
      const suitMod = enemy ? suitBonus(card.suit, enemy.suit) : 0;
      return Math.max(0, base + orientationBonus + suitMod);
    };

    const atkUnits = Array.from({ length: 6 }, (_, i) => ({ idx: i, slot: attacker.board[i] || { card: null, position: i } }))
      .filter(({ slot }) => !!(slot?.card))
      .map(({ idx, slot }) => ({ index: idx, card: slot!.card! }));
    const defUnits = Array.from({ length: 6 }, (_, i) => ({ idx: i, slot: defender.board[i] || { card: null, position: i } }))
      .filter(({ slot }) => !!(slot?.card))
      .map(({ idx, slot }) => ({ index: idx, card: slot!.card! }));

    const pairs = Math.min(atkUnits.length, defUnits.length);
    for (let i = 0; i < pairs; i++) {
      const atkCard = atkUnits[i].card;
      const defCard = defUnits[i].card;
      const atkDmg = effectivePower(atkCard, defCard);
      const defDmg = effectivePower(defCard, atkCard);

      const defNewHealth = Math.max(0, (defCard.health || 0) - atkDmg);
      const atkNewHealth = Math.max(0, (atkCard.health || 0) - defDmg);

      if (defNewHealth <= 0) destroyed.add(defCard.id);
      if (atkNewHealth <= 0) destroyed.add(atkCard.id);
    }

    return destroyed;
  };

  useEffect(() => {
    if (showCombatLines) {
      const destroyed = calculateDestroyedCards();
      setDestroyedCards(destroyed);
    } else {
      setDestroyedCards(new Set());
    }
  }, [showCombatLines, playerBoard, opponentBoard]);

  // Debug - removed to reduce console spam

  return (
    <div className="h-full flex flex-col justify-center relative">
      {/* Opponent Board */}
      <div className="flex justify-center gap-2 mb-4">
        {opponentSlots.map((slot, index) => (
          <BoardSlotComponent
            key={`opponent-${index}`}
            slot={slot}
            index={index}
            isPlayerSlot={false}
            canDrop={false}
            onCardClick={onCardClick}
            destroyedCards={destroyedCards}
          />
        ))}
      </div>

      {/* Battle Line */}
      <div className="relative h-2 my-4">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Combat Phase Indicator */}
        {showCombatLines && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-red-500/50 via-orange-500/50 to-red-500/50"
          />
        )}
      </div>

      {/* Player Board */}
      <div className="flex justify-center gap-2">
        {playerSlots.map((slot, index) => {
          const isSelected = !!slot.card && selectedAttackerIds.includes(slot.card.id);
          return (
            <div key={`player-${index}`} className={cn(isSelected && "ring-2 ring-yellow-400 rounded-lg relative")}
              onClick={() => {
                if (selectingAttackers && slot.card) {
                  onToggleAttacker?.(slot.card.id);
                } else if (slot.card) {
                  onCardClick?.(slot.card);
                }
              }}
            >
              <BoardSlotComponent
                slot={slot}
                index={index}
                isPlayerSlot={true}
                canDrop={canPlayUnits}
                onCardClick={onCardClick}
                destroyedCards={destroyedCards}
              />
              {isSelected && (
                <div className="absolute -top-3 -right-3 bg-yellow-500 text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                  {selectedAttackerIds.indexOf(slot.card!.id) + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Combat Animation System */}
      <CombatAnimationSystem
        showCombatLines={showCombatLines}
        playerSlots={playerSlots}
        opponentSlots={opponentSlots}
      />
    </div>
  );
}

// Combat Animation System Component
interface CombatAnimationSystemProps {
  showCombatLines: boolean;
  playerSlots: BoardSlot[];
  opponentSlots: BoardSlot[];
}

function CombatAnimationSystem({ showCombatLines, playerSlots, opponentSlots }: CombatAnimationSystemProps) {
  const [combatState, setCombatState] = useState<'idle' | 'charging' | 'clashing' | 'resolving'>('idle');
  const [damagedCards, setDamagedCards] = useState<Array<{ index: number, damage: number, isPlayer: boolean, destroyed: boolean }>>([]);

  useEffect(() => {
    if (showCombatLines && combatState === 'idle') {
      // Start combat animation sequence with requestAnimationFrame
      const startTime = performance.now();
      const animationDurations = {
        charging: 600,
        clashing: 400,
        resolving: 1000
      };

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;

        if (elapsed < animationDurations.charging) {
          setCombatState('charging');
          requestAnimationFrame(animate);
        } else if (elapsed < animationDurations.charging + animationDurations.clashing) {
          setCombatState('clashing');
          requestAnimationFrame(animate);
        } else if (elapsed < animationDurations.charging + animationDurations.clashing + animationDurations.resolving) {
          setCombatState('resolving');
          requestAnimationFrame(animate);
        } else {
          setCombatState('idle');
        }
      };

      requestAnimationFrame(animate);
    }
  }, [showCombatLines, combatState]);

  // Calculate combat results for animation (order-based pairing)
  const calculateCombatResults = () => {
    if (!showCombatLines) return [];

    const results = [];
    const playerUnits = playerSlots.map((s, i) => ({ index: i, card: s.card })).filter(x => !!x.card) as any[];
    const oppUnits = opponentSlots.map((s, i) => ({ index: i, card: s.card })).filter(x => !!x.card) as any[];

    const pairs = Math.min(playerUnits.length, oppUnits.length);
    for (let p = 0; p < pairs; p++) {
      const a = playerUnits[p];
      const b = oppUnits[p];
      const playerAtk = a.card.attack || 0;
      const oppAtk = b.card.attack || 0;
      const playerHealth = a.card.health || 0;
      const oppHealth = b.card.health || 0;

      const playerDestroyed = playerHealth <= oppAtk;
      const oppDestroyed = oppHealth <= playerAtk;

      results.push({ index: a.index, damage: oppAtk, isPlayer: true, destroyed: playerDestroyed, });
      results.push({ index: a.index, damage: playerAtk, isPlayer: false, destroyed: oppDestroyed, });
    }

    if (playerUnits.length > oppUnits.length) {
      for (let k = pairs; k < playerUnits.length; k++) {
        const a = playerUnits[k];
        results.push({ index: a.index, damage: a.card.attack || 0, isPlayer: false, destroyed: false, isNexus: true });
      }
    } else if (oppUnits.length > playerUnits.length) {
      for (let k = pairs; k < oppUnits.length; k++) {
        const b = oppUnits[k];
        results.push({ index: b.index, damage: b.card.attack || 0, isPlayer: true, destroyed: false, isNexus: true });
      }
    }
    return results;
  };

  const combatResults = calculateCombatResults();
  // Build order-based pairing for visuals
  const playerUnits = playerSlots.map((s, i) => ({ index: i, card: s.card as Card | null })).filter(x => !!x.card) as { index: number, card: Card }[];
  const oppUnits = opponentSlots.map((s, i) => ({ index: i, card: s.card as Card | null })).filter(x => !!x.card) as { index: number, card: Card }[];
  const paired = Array.from({ length: Math.min(playerUnits.length, oppUnits.length) }, (_, p) => ({
    playerIndex: playerUnits[p].index,
    oppIndex: oppUnits[p].index,
  }));

  return (
    <>
      {/* Combat Lines */}
      {showCombatLines && (
        <svg className="absolute inset-0 pointer-events-none">
          {paired.map((pair, idx) => {
            const startX = 150 + (pair.playerIndex * 158) + 75;
            const startY = 280;
            const endX = 150 + (pair.oppIndex * 158) + 75;
            const endY = 140;

            return (
              <g key={`combat-group-${idx}`}>
                <motion.line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Enhanced Collision Effects with Card Movement */}
      <AnimatePresence>
        {showCombatLines && (
          <>
            {paired.map((pair, idx) => {
              const playerCardXCenter = 150 + (pair.playerIndex * 158) + 75;
              const oppCardXCenter = 150 + (pair.oppIndex * 158) + 75;
              const playerCardY = 280;
              const oppCardY = 140;
              const collisionY = 210;
              const collisionX = (playerCardXCenter + oppCardXCenter) / 2;

              return (
                <div key={`collision-group-${idx}`}>
                  {/* Player card movement during clashing */}
                  {combatState === 'clashing' && (
                    <motion.div
                      className="absolute pointer-events-none"
                      style={{
                        left: playerCardXCenter - 75,
                        top: playerCardY - 105,
                        zIndex: 50
                      }}
                      initial={{ y: 0, rotate: 0 }}
                      animate={{ y: -35, rotate: -5 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <div className="w-[150px] h-[210px] bg-blue-400/20 rounded-md border-2 border-blue-400" />
                    </motion.div>
                  )}

                  {/* Opponent card movement during clashing */}
                  {combatState === 'clashing' && (
                    <motion.div
                      className="absolute pointer-events-none"
                      style={{
                        left: oppCardXCenter - 75,
                        top: oppCardY - 105,
                        zIndex: 50
                      }}
                      initial={{ y: 0, rotate: 0 }}
                      animate={{ y: 35, rotate: 5 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <div className="w-[150px] h-[210px] bg-red-400/20 rounded-md border-2 border-red-400" />
                    </motion.div>
                  )}

                  {/* Collision flash effect */}
                  {combatState === 'clashing' && (
                    <motion.div
                      className="absolute pointer-events-none"
                      style={{
                        left: collisionX - 40,
                        top: collisionY - 40,
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 2, 0], opacity: [0, 0.8, 0] }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      <div className="w-20 h-20 bg-gradient-to-r from-yellow-400/40 via-orange-400/30 to-transparent rounded-full flex items-center justify-center">
                        <Zap className="w-10 h-10 text-yellow-300 drop-shadow-lg" />
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </AnimatePresence>

      {/* Damage Numbers */}
      <AnimatePresence>
        {showCombatLines && combatState === 'resolving' && (
          <>
            {combatResults.map((result, i) => {
              if (result.isNexus) {
                // Nexus damage - show near player health
                const x = result.isPlayer ? 50 : 400;
                const y = result.isPlayer ? 350 : 70;
                return (
                  <motion.div
                    key={`nexus-damage-${i}`}
                    initial={{ scale: 0, y: -20, opacity: 0 }}
                    animate={{ scale: 1.5, y: 0, opacity: 1 }}
                    exit={{ scale: 0, y: 20, opacity: 0 }}
                    className="absolute text-red-500 font-bold text-3xl"
                    style={{ left: x, top: y }}
                  >
                    -{result.damage}
                  </motion.div>
                );
              }

              // Card damage
              const slotX = 150 + (result.index * 158) + 75;
              const slotY = result.isPlayer ? 280 : 140;

              return (
                <motion.div
                  key={`damage-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: result.destroyed ? 2 : 1.5,
                    opacity: 1,
                    y: result.destroyed ? -30 : 0
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={cn(
                    "absolute font-bold text-2xl pointer-events-none",
                    result.destroyed ? "text-red-600" : "text-red-500"
                  )}
                  style={{ left: slotX - 20, top: slotY - 40 }}
                >
                  {result.destroyed ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm">💀</span>
                      <span>-{result.damage}</span>
                    </div>
                  ) : (
                    `-${result.damage}`
                  )}
                </motion.div>
              );
            })}
          </>
        )}
      </AnimatePresence>

      {/* Death Animation Overlay */}
      <AnimatePresence>
        {showCombatLines && combatState === 'resolving' && (
          <>
            {combatResults
              .filter(result => result.destroyed && !result.isNexus)
              .map((result, i) => {
                const slotX = 150 + (result.index * 158) + 75;
                const slotY = result.isPlayer ? 280 : 140;

                return (
                  <motion.div
                    key={`death-${i}`}
                    className="absolute pointer-events-none"
                    style={{ left: slotX - 75, top: slotY - 105 }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 0.5, 0] }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                  >
                    <div className="w-[150px] h-[210px] bg-red-500/20 rounded-md flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.2, 0] }}
                        transition={{ duration: 1, delay: 0.5 }}
                      >
                        <div className="text-red-400 text-4xl">💀</div>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
          </>
        )}
      </AnimatePresence>
    </>
  );
}