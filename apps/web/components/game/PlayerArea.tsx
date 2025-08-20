'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { TarotCard } from './TarotCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Package, Trash2 } from 'lucide-react';
import { Player } from '@/lib/store/gameStore';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audio/AudioManager';

interface PlayerAreaProps {
  player: Player | undefined;
  isActive: boolean;
}

export function PlayerArea({ player, isActive }: PlayerAreaProps) {
  const [showHand, setShowHand] = useState(true);

  if (!player) return null;

  const handCards = player.hand || [];
  const deckCount = player.deck?.length || 0;
  const discardCount = player.discard?.length || 0;

  return (
    <div className="h-full relative px-8 py-4">
      {/* Player Info Panel with UI Asset Frame */}
      <div className="absolute left-8 top-4 flex items-center gap-4">
        <div className="relative">
          {/* Profile Frame */}
          <div 
            className="absolute inset-0 w-20 h-20 -m-2 pointer-events-none"
            style={{
              backgroundImage: 'url(/api/ui/themes/pixel-pack/others/card_ui_profile.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              imageRendering: 'pixelated'
            }}
          />
          <Avatar className="w-16 h-16 border-2 border-tarot-gold/50">
            <AvatarImage src={player.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
              {player.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div>
          <h3 className="text-white font-bold text-lg">{player.name}</h3>
          <div className="flex gap-4 mt-1">
            <div className="flex items-center gap-1">
              <span className="text-red-400 text-sm">Health:</span>
              <span className="text-white font-bold">{player.health}/{player.maxHealth}</span>
            </div>
          </div>
          <Progress 
            value={(player.health / player.maxHealth) * 100} 
            className="w-32 h-2 mt-1"
          />
        </div>
      </div>

      {/* Deck Area - Click to toggle hand */}
      <div className="absolute right-8 top-4 flex gap-3">
        <motion.div 
          className="relative w-20 h-24 cursor-pointer flex flex-col items-center justify-center"
          style={{
            backgroundImage: 'url(/api/ui/themes/pixel-pack/others/card_ui_buttons.png)',
            backgroundPosition: '-64px 0px', // Blue button normal state
            backgroundSize: '128px 128px',
            imageRendering: 'pixelated',
            backgroundRepeat: 'no-repeat'
          }}
          onClick={() => {
            setShowHand(!showHand);
            audioManager.playRandom('cardSlide');
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundPosition = '-64px -42px'; // Blue button hover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundPosition = '-64px 0px'; // Blue button normal
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundPosition = '-64px -84px'; // Blue button pressed
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundPosition = '-64px -42px'; // Blue button hover
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Package className="w-6 h-6 text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]" />
          <div className="text-white text-sm font-bold drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">{deckCount}</div>
          {!showHand && (
            <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
              <Eye className="w-3 h-3 text-black" />
            </div>
          )}
        </motion.div>
        <div 
          className="relative w-20 h-24 flex flex-col items-center justify-center"
          style={{
            backgroundImage: 'url(/api/ui/themes/pixel-pack/others/card_ui_buttons.png)',
            backgroundPosition: '-96px 0px', // Red button normal state
            backgroundSize: '128px 128px',
            imageRendering: 'pixelated',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <Trash2 className="w-6 h-6 text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]" />
          <div className="text-white text-sm font-bold drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">{discardCount}</div>
        </div>
      </div>

      {/* Hand Container - Improved fan layout */}
      <AnimatePresence>
        {showHand && (
          <motion.div
            initial={{ opacity: 0, y: 200 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 200 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{ width: '100%', maxWidth: '1200px' }}
          >
            <div className="relative flex justify-center items-end pb-4">
              {handCards.map((card, index) => {
                const totalCards = handCards.length;
                const maxAngle = Math.min(totalCards * 3, 30); // Max spread angle
                const angleStep = totalCards > 1 ? maxAngle / (totalCards - 1) : 0;
                const angle = totalCards > 1 
                  ? -maxAngle/2 + (index * angleStep)
                  : 0;
                
                // Calculate position in arc
                const radius = 300; // Radius of the arc
                const offsetX = Math.sin(angle * Math.PI / 180) * radius;
                const offsetY = (1 - Math.cos(angle * Math.PI / 180)) * radius * 0.3;
                
                return (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0, y: 100, opacity: 0 }}
                    animate={{ 
                      scale: 1,
                      x: offsetX,
                      y: offsetY,
                      rotate: angle,
                      opacity: 1
                    }}
                    exit={{ scale: 0, y: 100, opacity: 0 }}
                    whileHover={{ 
                      y: offsetY - 40,
                      scale: 1.15,
                      rotate: 0,
                      zIndex: 100,
                      transition: { duration: 0.2 }
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25,
                      delay: index * 0.03
                    }}
                    style={{
                      position: 'absolute',
                      zIndex: index + 10,
                      transformOrigin: 'bottom center'
                    }}
                    className="pointer-events-auto cursor-pointer"
                  >
                    <TarotCard
                      card={card}
                      isInHand={true}
                      isSelectable={isActive}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Player Glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" />
        </motion.div>
      )}
    </div>
  );
}