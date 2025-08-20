'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { TarotCard } from './TarotCard';
import { BoardSlot, GamePhase } from '@/lib/store/gameStore';
import { Swords, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CenterBoardProps {
  playerBoard: BoardSlot[];
  opponentBoard: BoardSlot[];
  phase: GamePhase;
  isMyTurn: boolean;
}

interface BoardSlotComponentProps {
  slot: BoardSlot;
  index: number;
  isPlayerSlot: boolean;
  canDrop: boolean;
}

function BoardSlotComponent({ slot, index, isPlayerSlot, canDrop }: BoardSlotComponentProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${isPlayerSlot ? 'player' : 'opponent'}-${index}`,
    data: { slot: index, isPlayerSlot },
    disabled: !canDrop
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative w-[150px] h-[210px] rounded-lg border-2 transition-all duration-200",
        slot.card 
          ? "border-transparent" 
          : "border-dashed border-white/20 bg-black/20",
        isOver && canDrop && "border-yellow-400 bg-yellow-400/10 scale-105",
        slot.isBlocked && "opacity-50 cursor-not-allowed"
      )}
    >
      {slot.card ? (
        <TarotCard
          card={slot.card}
          isOnBoard={true}
          isSelectable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white/20 text-6xl">
            {index + 1}
          </div>
        </div>
      )}

      {/* Attack Lane Indicator */}
      {slot.card && isPlayerSlot && (
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

export function CenterBoard({ playerBoard, opponentBoard, phase, isMyTurn }: CenterBoardProps) {
  // Ensure we always have 6 slots
  const playerSlots: BoardSlot[] = Array.from({ length: 6 }, (_, i) => 
    playerBoard[i] || { card: null, position: i }
  );
  const opponentSlots: BoardSlot[] = Array.from({ length: 6 }, (_, i) => 
    opponentBoard[i] || { card: null, position: i }
  );

  const showCombatLines = phase === 'combat';

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
            canDrop={isMyTurn && phase === 'main'}
          />
        ))}
      </div>

      {/* Combat Visualization */}
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
              <motion.line
                key={`combat-line-${index}`}
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
            );
          })}
        </svg>
      )}

      {/* Damage Preview Numbers */}
      <AnimatePresence>
        {showCombatLines && (
          <>
            {playerSlots.map((slot, index) => {
              if (!slot.card?.attack) return null;
              return (
                <motion.div
                  key={`damage-${index}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute text-red-500 font-bold text-2xl"
                  style={{
                    left: `${150 + (index * 158) + 60}px`,
                    top: '200px'
                  }}
                >
                  -{slot.card.attack}
                </motion.div>
              );
            })}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}