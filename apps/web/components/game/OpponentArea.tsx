'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Package, Trash2 } from 'lucide-react';
import { Player } from '@/lib/store/gameStore';
import { getRandomCardBack } from '@/lib/cardBacks';

interface OpponentAreaProps {
  player: Player | undefined;
  isActive: boolean;
}

export function OpponentArea({ player, isActive }: OpponentAreaProps) {
  const [cardBack, setCardBack] = useState<string>('/api/ui/themes/pixel-pack/sheets/card_ui_01.png');
  
  useEffect(() => {
    // Select a random card back for this opponent
    const randomBack = getRandomCardBack();
    setCardBack(randomBack.image);
  }, []);
  
  if (!player) return null;

  const handCount = player.hand?.length || 0;
  const deckCount = player.deck?.length || 0;
  const discardCount = player.discard?.length || 0;

  return (
    <div className="h-full relative px-8 py-4">
      {/* Opponent Info Panel */}
      <div className="absolute right-8 bottom-4 flex items-center gap-4">
        <div className="text-right">
          <h3 className="text-white font-bold text-lg">{player.name}</h3>
          <div className="flex gap-4 mt-1 justify-end">
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
        
        <Avatar className="w-16 h-16 border-2 border-white/20">
          <AvatarImage src={player.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-red-600 to-orange-600 text-white">
            {player.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Deck & Discard Zone */}
      <div className="absolute left-8 bottom-4 flex gap-3">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <Package className="w-8 h-8 text-blue-400 mb-1" />
          <div className="text-white text-sm font-bold text-center">{deckCount}</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <Trash2 className="w-8 h-8 text-red-400 mb-1" />
          <div className="text-white text-sm font-bold text-center">{discardCount}</div>
        </div>
      </div>

      {/* Opponent Hand (Face Down) */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 flex">
        {Array.from({ length: handCount }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0, y: -50 }}
            animate={{ scale: 0.7, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              marginLeft: index === 0 ? 0 : '-40px',
              zIndex: index + 1
            }}
            className="relative"
          >
            <div 
              className="w-[100px] h-[140px] rounded-lg shadow-xl overflow-hidden border-2 border-purple-600"
              style={{
                backgroundImage: `url(${cardBack})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'auto'
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Active Player Glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse" />
        </motion.div>
      )}
    </div>
  );
}