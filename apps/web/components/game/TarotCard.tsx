'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardOrientation } from '@/lib/store/gameStore';
import { Sparkles, Moon, Sun, Flame, Droplets, Swords, Coins } from 'lucide-react';
import { audioManager } from '@/lib/audio/AudioManager';
import { getPlayerCardBack } from '@/lib/cardBacks';

interface TarotCardProps {
  card: Card;
  isInHand?: boolean;
  isOnBoard?: boolean;
  isDragging?: boolean;
  isSelectable?: boolean;
  scale?: number;
  onClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function TarotCard({
  card,
  isInHand = false,
  isOnBoard = false,
  isDragging = false,
  isSelectable = true,
  scale = 1,
  onClick,
  onRightClick,
  className
}: TarotCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [playerCardBack, setPlayerCardBack] = useState<string>('/api/ui/themes/pixel-pack/sheets/card_ui_01.png');
  const isReversed = card.orientation === 'reversed';
  
  useEffect(() => {
    const cardBack = getPlayerCardBack();
    setPlayerCardBack(cardBack.image);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingLocal
  } = useDraggable({
    id: card.id,
    data: card,
    disabled: !isInHand || !isSelectable
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const cardScale = isInHand && !isHovered ? 0.5 : scale;
  const actuallyDragging = isDragging || isDraggingLocal;

  const getSuitColor = (suit: string) => {
    switch(suit) {
      case 'wands': return 'from-tarot-suits-wands to-red-700';
      case 'cups': return 'from-tarot-suits-cups to-blue-700';
      case 'swords': return 'from-tarot-suits-swords to-purple-700';
      case 'pentacles': return 'from-tarot-suits-pentacles to-green-700';
      case 'major': return 'from-tarot-suits-major to-tarot-gold';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getSuitIcon = (suit: string) => {
    switch(suit) {
      case 'wands': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'cups': return <Droplets className="w-5 h-5 text-blue-400" />;
      case 'swords': return <Swords className="w-5 h-5 text-purple-400" />;
      case 'pentacles': return <Coins className="w-5 h-5 text-green-400" />;
      case 'major': return <Sun className="w-5 h-5 text-yellow-400" />;
      default: return <Sparkles className="w-5 h-5 text-gray-400" />;
    }
  };

  // Build card image URL from server
  const cardImageUrl = `/api/card-image?id=${card.id}&deck=${card.deck || 'classic'}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative cursor-pointer transition-all duration-150",
        actuallyDragging && "z-50 cursor-grabbing",
        className
      )}
      onMouseEnter={() => {
        setIsHovered(true);
        if (isInHand) audioManager.play('card_slide_01');
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (onClick) {
          audioManager.playRandom('cardPlace');
          onClick();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        audioManager.playRandom('cardFlip');
        onRightClick?.(e);
        setIsFlipped(!isFlipped);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          className="relative preserve-3d"
          initial={false}
          animate={{
            scale: actuallyDragging ? 1.1 : cardScale,
            rotateY: isFlipped ? 180 : 0,
            rotateZ: isReversed && !isFlipped ? 180 : 0,
          }}
          transition={{
            duration: 0.3,
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
          style={{
            transformStyle: 'preserve-3d',
            width: '150px',
            height: '210px',
          }}
        >
          {/* Card Front */}
          <motion.div
            className={cn(
              "absolute inset-0 rounded-lg shadow-xl backface-hidden",
              "bg-gradient-to-br border-2",
              getSuitColor(card.suit),
              isHovered && "shadow-2xl ring-2 ring-yellow-400",
              actuallyDragging && "opacity-90"
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="relative h-full p-2 flex flex-col text-white">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold">{card.cost}</span>
                  {card.orientation === 'reversed' && (
                    <Moon className="w-3 h-3" />
                  )}
                </div>
                <div className="text-2xl">{getSuitIcon(card.suit)}</div>
              </div>

              {/* Card Name */}
              <div className="text-center mb-2">
                <h3 className="text-sm font-bold leading-tight">{card.name}</h3>
              </div>

              {/* Card Art Area */}
              <div className="flex-1 bg-black/20 rounded mb-2 overflow-hidden relative">
                {/* Try to load the actual card image */}
                {cardImageUrl && (
                  <img 
                    src={cardImageUrl} 
                    alt={card.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide image on error and show fallback
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {/* Fallback icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {card.type === 'major' ? (
                    <Sparkles className="w-12 h-12 text-yellow-300" />
                  ) : (
                    <div className="text-4xl opacity-50">{getSuitIcon(card.suit)}</div>
                  )}
                </div>
              </div>

              {/* Card Text */}
              <div className="text-xs leading-tight mb-2 min-h-[40px]">
                <p className="line-clamp-3">
                  {isReversed ? card.reversedDescription : card.description}
                </p>
              </div>

              {/* Card Stats */}
              {card.type === 'unit' && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="bg-red-600/50 px-2 py-1 rounded">
                    {card.attack || 0}
                  </span>
                  <span className="bg-blue-600/50 px-2 py-1 rounded">
                    {card.health || 0}
                  </span>
                </div>
              )}
            </div>

            {/* Rarity Gem */}
            <div className="absolute top-1 right-1">
              {card.rarity === 'mythic' && (
                <div className="w-3 h-3 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-pulse" />
              )}
              {card.rarity === 'rare' && (
                <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full" />
              )}
              {card.rarity === 'uncommon' && (
                <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full" />
              )}
            </div>
          </motion.div>

          {/* Card Back */}
          <motion.div
            className="absolute inset-0 rounded-lg shadow-xl backface-hidden overflow-hidden"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="h-full bg-gradient-to-br from-tarot-mystic-indigo via-tarot-mystic-purple to-tarot-mystic-violet border-2 border-tarot-gold/30 flex items-center justify-center">
              <div className="text-center">
                <div className="relative">
                  <Sun className="w-16 h-16 text-tarot-gold mb-2" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-16 h-16 text-tarot-gold/50" />
                  </motion.div>
                </div>
                <p className="text-tarot-gold text-sm font-semibold">Arcanum</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Hover Effect Glow */}
      {isHovered && !actuallyDragging && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
            filter: 'blur(20px)',
            transform: 'scale(1.2)',
          }}
        />
      )}
    </div>
  );
}