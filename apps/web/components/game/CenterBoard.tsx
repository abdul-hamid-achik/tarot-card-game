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
    >
      <AnimatePresence mode="wait">
        {slot.card && !isCardDestroyed ? (
          <motion.div
            key={slot.card.id}
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 45 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
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

export function CenterBoard({ playerBoard, opponentBoard, phase, isMyTurn, onCardClick }: CenterBoardProps) {
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

  // Calculate which cards will be destroyed based on combat
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

    const atkBoard = Array.from({ length: 6 }, (_, i) => attacker.board[i] || { card: null, position: i });
    const defBoard = Array.from({ length: 6 }, (_, i) => defender.board[i] || { card: null, position: i });

    for (let i = 0; i < 6; i++) {
      const atkSlot = atkBoard[i];
      const defSlot = defBoard[i];
      const atkCard = (atkSlot?.card?.type === 'unit' || atkSlot?.card?.type === 'major' || (atkSlot?.card?.type === 'spell' && atkSlot?.card?.suit === 'major')) ? atkSlot.card : null;
      const defCard = (defSlot?.card?.type === 'unit' || defSlot?.card?.type === 'major' || (defSlot?.card?.type === 'spell' && defSlot?.card?.suit === 'major')) ? defSlot.card : null;

      if (!atkCard && !defCard) continue;

      if (atkCard && defCard) {
        // Both units strike simultaneously
        const atkDmg = effectivePower(atkCard, defCard);
        const defDmg = effectivePower(defCard, atkCard);

        // Calculate new health after damage
        const defNewHealth = Math.max(0, (defCard.health || 0) - atkDmg);
        const atkNewHealth = Math.max(0, (atkCard.health || 0) - defDmg);

        // Mark cards as destroyed if health <= 0
        if (defNewHealth <= 0 && defCard) {
          destroyed.add(defCard.id);
        }
        if (atkNewHealth <= 0 && atkCard) {
          destroyed.add(atkCard.id);
        }
      }
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
        {playerSlots.map((slot, index) => (
          <BoardSlotComponent
            key={`player-${index}`}
            slot={slot}
            index={index}
            isPlayerSlot={true}
            canDrop={canPlayUnits}
            onCardClick={onCardClick}
            destroyedCards={destroyedCards}
          />
        ))}
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

  // Calculate combat results for animation
  const calculateCombatResults = () => {
    if (!showCombatLines) return [];

    const results = [];
    for (let i = 0; i < 6; i++) {
      const playerSlot = playerSlots[i];
      const oppSlot = opponentSlots[i];

      if (playerSlot?.card && oppSlot?.card) {
        // Both cards exist - they fight
        const playerAtk = playerSlot.card.attack || 0;
        const oppAtk = oppSlot.card.attack || 0;
        const playerHealth = playerSlot.card.health || 0;
        const oppHealth = oppSlot.card.health || 0;

        // Simple combat calculation (can be enhanced with suit bonuses)
        const playerDestroyed = playerHealth <= oppAtk;
        const oppDestroyed = oppHealth <= playerAtk;

        if (!playerDestroyed) {
          results.push({
            index: i,
            damage: oppAtk,
            isPlayer: true,
            destroyed: false
          });
        } else {
          results.push({
            index: i,
            damage: playerHealth,
            isPlayer: true,
            destroyed: true
          });
        }

        if (!oppDestroyed) {
          results.push({
            index: i,
            damage: playerAtk,
            isPlayer: false,
            destroyed: false
          });
        } else {
          results.push({
            index: i,
            damage: oppHealth,
            isPlayer: false,
            destroyed: true
          });
        }
      } else if (playerSlot?.card && !oppSlot?.card) {
        // Direct player attack on opponent nexus
        results.push({
          index: i,
          damage: playerSlot.card.attack || 0,
          isPlayer: false,
          destroyed: false,
          isNexus: true
        });
      } else if (!playerSlot?.card && oppSlot?.card) {
        // Direct opponent attack on player nexus
        results.push({
          index: i,
          damage: oppSlot.card.attack || 0,
          isPlayer: true,
          destroyed: false,
          isNexus: true
        });
      }
    }
    return results;
  };

  const combatResults = calculateCombatResults();

  return (
    <>
      {/* Combat Lines */}
      {showCombatLines && (
        <svg className="absolute inset-0 pointer-events-none">
          {playerSlots.map((playerSlot, index) => {
            const oppSlot = opponentSlots[index];
            if (!playerSlot.card || !oppSlot.card) return null;

            const startX = 150 + (index * 158) + 75;
            const startY = 280;
            const endX = startX;
            const endY = 140;

            return (
              <g key={`combat-group-${index}`}>
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
                  transition={{ duration: 0.5, delay: index * 0.1 }}
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
            {playerSlots.map((playerSlot, index) => {
              const oppSlot = opponentSlots[index];
              if (!playerSlot.card || !oppSlot.card) return null;

              const centerX = 150 + (index * 158) + 75;
              const playerCardY = 280;
              const oppCardY = 140;
              const collisionY = 210;

              return (
                <motion.g key={`collision-group-${index}`}>
                  {/* Player card movement during clashing */}
                  {combatState === 'clashing' && (
                    <motion.div
                      className="absolute pointer-events-none"
                      style={{
                        left: centerX - 75,
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
                        left: centerX - 75,
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
                        left: centerX - 40,
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
                </motion.g>
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