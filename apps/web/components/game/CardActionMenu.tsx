'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Play, X, Sparkles } from 'lucide-react';
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
          
          {/* Action Menu - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: -5 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50"
            style={{
              left: `${position.x}px`,
              top: `${position.y - 10}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="bg-black/95 backdrop-blur-sm rounded-lg border border-tarot-gold/40 shadow-xl">
              <div className="flex gap-0.5 p-1">
                {/* View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                  className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                  title="View Card"
                >
                  <Eye className="w-4 h-4" />
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
                    "flex items-center gap-1 px-2 py-2 rounded transition-colors",
                    canPlay ? [
                      "hover:bg-white/10 text-green-400"
                    ] : [
                      "cursor-not-allowed text-gray-500"
                    ]
                  )}
                  title={canPlay ? `Play for ${card.cost} fate` : `Need ${manaNeeded} more fate`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold">
                    {card.cost}
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