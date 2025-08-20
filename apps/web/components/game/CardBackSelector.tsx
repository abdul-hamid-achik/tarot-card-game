'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Lock, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  cardBacks, 
  getPlayerCardBack, 
  savePlayerCardBack,
  getRarityColor,
  getRarityBorderColor
} from '@/lib/cardBacks';

interface CardBackSelectorProps {
  onSelect?: (cardBackId: string) => void;
  showAsDialog?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function CardBackSelector({ 
  onSelect, 
  showAsDialog = false,
  isOpen = false,
  onClose 
}: CardBackSelectorProps) {
  const [selectedBack, setSelectedBack] = useState<string>('classic');
  const [hoveredBack, setHoveredBack] = useState<string | null>(null);

  useEffect(() => {
    const currentBack = getPlayerCardBack();
    setSelectedBack(currentBack.id);
  }, []);

  const handleSelect = (cardBackId: string) => {
    const cardBack = cardBacks.find(cb => cb.id === cardBackId);
    if (!cardBack?.unlocked) return;
    
    setSelectedBack(cardBackId);
    savePlayerCardBack(cardBackId);
    onSelect?.(cardBackId);
  };

  const content = (
    <div className="grid grid-cols-3 gap-4 p-4">
      {cardBacks.map((cardBack) => (
        <motion.div
          key={cardBack.id}
          whileHover={{ scale: cardBack.unlocked ? 1.05 : 1 }}
          whileTap={{ scale: cardBack.unlocked ? 0.95 : 1 }}
          onMouseEnter={() => setHoveredBack(cardBack.id)}
          onMouseLeave={() => setHoveredBack(null)}
          className="relative"
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all",
              cardBack.unlocked ? "hover:shadow-xl" : "opacity-50 cursor-not-allowed",
              selectedBack === cardBack.id && "ring-2 ring-yellow-400",
              getRarityBorderColor(cardBack.rarity)
            )}
            onClick={() => handleSelect(cardBack.id)}
          >
            {/* Card Back Preview */}
            <div className="relative aspect-[5/7]">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${cardBack.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  imageRendering: 'auto',
                  filter: cardBack.unlocked ? 'none' : 'grayscale(1) brightness(0.5)'
                }}
              />
              
              {/* Lock Overlay */}
              {!cardBack.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              )}
              
              {/* Selected Indicator */}
              {selectedBack === cardBack.id && cardBack.unlocked && (
                <div className="absolute top-2 right-2 bg-yellow-400 rounded-full p-1">
                  <Check className="w-4 h-4 text-black" />
                </div>
              )}
              
              {/* Rarity Badge */}
              <div className="absolute bottom-2 left-2">
                <Badge className={cn(
                  "text-white text-xs px-2 py-1",
                  `bg-gradient-to-r ${getRarityColor(cardBack.rarity)}`
                )}>
                  {cardBack.rarity.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            {/* Card Back Info */}
            <div className="p-3 bg-black/40 backdrop-blur-sm">
              <h4 className="text-white font-bold text-sm mb-1">{cardBack.name}</h4>
              {!cardBack.unlocked && (
                <p className="text-xs text-gray-400">Unlock through gameplay</p>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  if (showAsDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              Select Card Back
            </DialogTitle>
          </DialogHeader>
          
          {content}
          
          <div className="flex justify-end gap-3 mt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-transparent text-white border-white/20"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}