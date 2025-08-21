'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Sun, Moon, Swords, Droplets, Flame, Coins } from 'lucide-react';
import { Card } from '@/lib/store/gameStore';
import { getCardDescription, getCardMeaning, getTarotMeaning } from '@/lib/tarot-meanings';
import { cn } from '@/lib/utils';

interface CardOverlayProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardOverlay({ card, isOpen, onClose }: CardOverlayProps) {
  if (!card) return null;

  const tarotMeaning = getTarotMeaning(card);
  const description = getCardDescription(card);
  const meaning = getCardMeaning(card);
  const isReversed = card.orientation === 'reversed';

  const getSuitIcon = (suit: string) => {
    switch (suit) {
      case 'wands': return <Flame className="w-6 h-6 text-orange-400" />;
      case 'cups': return <Droplets className="w-6 h-6 text-blue-400" />;
      case 'swords': return <Swords className="w-6 h-6 text-purple-400" />;
      case 'pentacles': return <Coins className="w-6 h-6 text-green-400" />;
      case 'major': return <Sun className="w-6 h-6 text-yellow-400" />;
      default: return <Sparkles className="w-6 h-6 text-gray-400" />;
    }
  };

  const getSuitColor = (suit: string) => {
    switch (suit) {
      case 'wands': return 'from-orange-600 to-red-700';
      case 'cups': return 'from-blue-600 to-blue-800';
      case 'swords': return 'from-purple-600 to-purple-800';
      case 'pentacles': return 'from-green-600 to-green-800';
      case 'major': return 'from-yellow-600 to-yellow-800';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            requestAnimationFrame(() => {
              onClose();
            });
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          
          {/* Overlay Content */}
          <motion.div
            className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-yellow-500/30 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="card-overlay-content"
          >
            {/* Close Button */}
            <button
              onClick={() => {
                requestAnimationFrame(() => {
                  onClose();
                });
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              data-testid="btn-close-card-overlay"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Header */}
            <div className={cn(
              "p-6 bg-gradient-to-r rounded-t-lg border-b border-yellow-500/20",
              getSuitColor(card.suit)
            )}>
              <div className="flex items-center gap-3">
                {getSuitIcon(card.suit)}
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                    {tarotMeaning?.name || card.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-white/80 capitalize">
                      {card.suit} • {card.type}
                    </span>
                    {isReversed && (
                      <div className="flex items-center gap-1 text-red-300">
                        <Moon className="w-4 h-4" />
                        <span className="text-sm">Reversed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Image */}
            <div className="p-6 flex justify-center">
              <div className="relative">
                <motion.div
                  className="w-64 h-96 rounded-lg overflow-hidden shadow-xl"
                  animate={{
                    rotateZ: isReversed ? 180 : 0
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                      <div className="text-center">
                        {getSuitIcon(card.suit)}
                        <p className="text-white mt-2 text-sm">{card.name}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
                
                {/* Card Stats Overlay */}
                <div className="absolute -bottom-2 -right-2 flex gap-2">
                  <div className="bg-red-900/95 px-3 py-1 rounded border border-red-700 text-white text-sm font-bold shadow-lg">
                    ⚔ {card.attack ?? 0}
                  </div>
                  <div className="bg-blue-900/95 px-3 py-1 rounded border border-blue-700 text-white text-sm font-bold shadow-lg">
                    ❤ {card.health ?? 0}
                  </div>
                  <div className="bg-yellow-900/95 px-3 py-1 rounded border border-yellow-700 text-white text-sm font-bold shadow-lg">
                    ⚡ {card.cost}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Tarot Meaning */}
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Tarot Meaning
                </h3>
                <p className="text-white/90 italic text-lg">{meaning}</p>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                  {isReversed ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  {isReversed ? 'Reversed' : 'Upright'} Interpretation
                </h3>
                <p className="text-white/80 leading-relaxed">{description}</p>
              </div>

              {/* Game Effect (if it has custom description) */}
              {card.description && (
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                    <Swords className="w-5 h-5" />
                    Game Effect
                  </h3>
                  <p className="text-white/80 leading-relaxed">
                    {isReversed && card.reversedDescription ? card.reversedDescription : card.description}
                  </p>
                </div>
              )}

              {/* Card Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-yellow-500/20">
                <div>
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">Rarity</h4>
                  <p className="text-white/80 capitalize">{card.rarity}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">Suit</h4>
                  <p className="text-white/80 capitalize">{card.suit}</p>
                </div>
                {card.number && (
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-400 mb-1">Number</h4>
                    <p className="text-white/80">{card.number}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">Type</h4>
                  <p className="text-white/80 capitalize">{card.type}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}