'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Play, X } from 'lucide-react';
import { Card } from '@/lib/store/gameStore';
import { cn } from '@/lib/utils';

interface CardActionMenuProps {
  card: Card | null;
  isOpen: boolean;
  position: { x: number; y: number };
  onPlay: () => void;
  onView: () => void;
  onClose: () => void;
  canPlay?: boolean;
  playerMana?: number;
  playerSpellMana?: number;
}

export function CardActionMenu({ 
  card, 
  isOpen, 
  position, 
  onPlay, 
  onView, 
  onClose,
  canPlay = true,
  playerMana = 0,
  playerSpellMana = 0
}: CardActionMenuProps) {
  if (!card || !isOpen) return null;

  const totalMana = playerMana + (card.type === 'spell' ? playerSpellMana : 0);
  const manaNeeded = Math.max(0, card.cost - totalMana);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to catch clicks outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={onClose}
          />
          
          {/* Action Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="bg-black/90 backdrop-blur-md rounded-xl border border-tarot-gold/30 p-2 shadow-2xl">
              {/* Card Name */}
              <div className="text-white text-sm font-bold px-3 py-1 mb-2 text-center border-b border-tarot-gold/20">
                {card.name}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-blue-600/80 hover:bg-blue-500",
                    "text-white font-medium",
                    "transition-all duration-200",
                    "hover:scale-105"
                  )}
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>

                {/* Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canPlay) {
                      onPlay();
                    }
                  }}
                  disabled={!canPlay}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "font-medium transition-all duration-200",
                    canPlay ? [
                      "bg-green-600/80 hover:bg-green-500",
                      "text-white hover:scale-105"
                    ] : [
                      "bg-gray-700/50 cursor-not-allowed",
                      "text-gray-400"
                    ]
                  )}
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {canPlay ? (
                      `Play (${card.cost})`
                    ) : (
                      `Need ${manaNeeded} more`
                    )}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}