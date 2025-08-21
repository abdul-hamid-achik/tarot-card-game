'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PixelButton } from '@/components/ui/pixel-button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { audioManager } from '@/lib/audio/AudioManager';
import { gameLogger } from '@tarot/game-logger';
import {
  Sparkles,
  Check,
  Lock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Palette
} from 'lucide-react';
import { CardBackSelector } from './CardBackSelector';

interface DeckOption {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  isUnlocked: boolean;
  coverCard?: string;
  theme: string;
  artist?: string;
}

const availableDecks: DeckOption[] = [
  {
    id: 'classic',
    name: 'Classic Rider-Waite',
    description: 'The traditional tarot deck with timeless symbolism',
    cardCount: 78,
    isUnlocked: true,
    coverCard: 'major_00',
    theme: 'traditional',
    artist: 'Pamela Colman Smith'
  },
  {
    id: 'arcana-a',
    name: 'Arcana Series',
    description: 'Modern mystical interpretation with vibrant colors',
    cardCount: 22,
    isUnlocked: true,
    coverCard: 'major_01',
    theme: 'modern',
    artist: 'Digital Artist'
  },
  {
    id: 'marigold',
    name: 'Marigold Tarot',
    description: 'Elegant botanical-themed deck with golden accents',
    cardCount: 22,
    isUnlocked: true,
    coverCard: 'major_02',
    theme: 'botanical',
    artist: 'Amrit Brar'
  },
  {
    id: 'duality-color',
    name: 'Duality Color',
    description: 'Bold contrasts and dual nature themes',
    cardCount: 22,
    isUnlocked: false,
    coverCard: 'major_03',
    theme: 'abstract',
    artist: 'Unknown'
  },
  {
    id: 'duality-mono',
    name: 'Duality Monochrome',
    description: 'Minimalist black and white interpretations',
    cardCount: 22,
    isUnlocked: false,
    coverCard: 'major_04',
    theme: 'minimalist',
    artist: 'Unknown'
  }
];

interface DeckSelectorProps {
  onSelectDeck: (deckId: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function DeckSelector({ onSelectDeck, onBack, showBackButton = true }: DeckSelectorProps) {
  const [selectedDeck, setSelectedDeck] = useState<string>('classic');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showCardBackSelector, setShowCardBackSelector] = useState(false);
  const [previewCards, setPreviewCards] = useState<string[]>([]);

  useEffect(() => {
    // Preload card sounds
    audioManager.preloadCategory('cardFlip');
    audioManager.preloadCategory('cardReveal');
  }, []);

  const handleSelectDeck = (deckId: string) => {
    const deck = availableDecks.find(d => d.id === deckId);
    if (!deck?.isUnlocked) return;

    setSelectedDeck(deckId);
    audioManager.playRandom('cardFlip');
  };

  const handleConfirmDeck = () => {
    audioManager.playRandom('cardReveal');
    onSelectDeck(selectedDeck);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + availableDecks.length) % availableDecks.length);
    audioManager.playRandom('cardFlip');
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % availableDecks.length);
    audioManager.playRandom('cardFlip');
  };

  const currentDeck = availableDecks[currentIndex];

  const togglePreview = () => {
    setShowPreview(!showPreview);
    if (!showPreview) {
      // Generate preview cards
      const cards = [];
      for (let i = 0; i < 5; i++) {
        cards.push(`major_${String(i).padStart(2, '0')}`);
      }
      setPreviewCards(cards);
      audioManager.playRandom('cardReveal');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-tarot-board-dark via-tarot-board-medium to-tarot-board-light relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-mystic-gradient opacity-30" />
        {/* UI Background Texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url(/api/ui/themes/pixel-pack/others/card_ui_gold_tiles.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 200px'
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {showBackButton && (
            <Button
              onClick={onBack}
              variant="ghost"
              className="mb-4 text-tarot-gold hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-4xl font-bold text-tarot-gold text-center mb-2">
            Choose Your Deck
          </h1>
          <p className="text-gray-400 text-center">
            Select the tarot deck that resonates with your spirit
          </p>
        </div>

        {/* Carousel View */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Previous Button */}
            <Button
              onClick={handlePrevious}
              variant="ghost"
              size="icon"
              className="text-tarot-gold hover:text-white"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>

            {/* Deck Display */}
            <motion.div
              key={currentDeck.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex-1 max-w-lg"
            >
              <Card className={cn(
                "relative overflow-hidden border-2 transition-all duration-300",
                currentDeck.isUnlocked
                  ? "bg-black/60 border-tarot-gold/50 hover:border-tarot-gold cursor-pointer"
                  : "bg-black/40 border-gray-700 cursor-not-allowed"
              )}>
                {/* Card Frame Background */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `url(/api/ui/themes/pixel-pack/others/card_ui_${currentDeck.isUnlocked ? 'gold' : 'silver'
                      }_front.png)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />

                <CardHeader className="relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl text-tarot-gold">
                        {currentDeck.name}
                      </CardTitle>
                      {currentDeck.artist && (
                        <p className="text-sm text-gray-400 mt-1">
                          by {currentDeck.artist}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={currentDeck.isUnlocked ? "default" : "secondary"}
                      className={cn(
                        currentDeck.isUnlocked
                          ? "bg-tarot-gold text-black"
                          : "bg-gray-700"
                      )}
                    >
                      {currentDeck.isUnlocked ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Unlocked
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  {/* Deck Preview Image */}
                  <div className="aspect-[3/4] mb-4 rounded-lg overflow-hidden bg-black/40 relative">
                    {currentDeck.coverCard && (
                      <img
                        src={`/api/card-image?id=${currentDeck.coverCard}&deck=${currentDeck.id}`}
                        alt={currentDeck.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}

                    {/* Lock Overlay */}
                    {!currentDeck.isUnlocked && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Lock className="w-16 h-16 text-gray-500" />
                      </div>
                    )}
                  </div>

                  <p className="text-gray-300 mb-4">{currentDeck.description}</p>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {currentDeck.cardCount} cards
                    </span>
                    <Badge variant="outline" className="text-tarot-gold border-tarot-gold/50">
                      {currentDeck.theme}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Next Button */}
            <Button
              onClick={handleNext}
              variant="ghost"
              size="icon"
              className="text-tarot-gold hover:text-white"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={togglePreview}
              variant="outline"
              disabled={!currentDeck.isUnlocked}
              className="bg-black/40 text-tarot-gold border-tarot-gold/50 hover:bg-tarot-gold/20"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Cards
            </Button>

            <Button
              onClick={() => setShowCardBackSelector(true)}
              variant="outline"
              className="bg-black/40 text-purple-400 border-purple-400/50 hover:bg-purple-400/20"
            >
              <Palette className="w-4 h-4 mr-2" />
              Card Back
            </Button>

            <PixelButton
              onClick={handleConfirmDeck}
              disabled={!currentDeck.isUnlocked || selectedDeck !== currentDeck.id}
              variant={currentDeck.isUnlocked && selectedDeck === currentDeck.id ? "gold" : "default"}
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              SELECT THIS DECK
            </PixelButton>
          </div>

          {/* Deck Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {availableDecks.map((deck, index) => (
              <button
                key={deck.id}
                onClick={() => {
                  setCurrentIndex(index);
                  audioManager.playRandom('cardFlip');
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex
                    ? "w-8 bg-tarot-gold"
                    : "bg-gray-600 hover:bg-gray-500"
                )}
              />
            ))}
          </div>
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
              onClick={togglePreview}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="grid grid-cols-5 gap-4 max-w-4xl"
                onClick={(e) => e.stopPropagation()}
              >
                {previewCards.map((cardId, index) => (
                  <motion.div
                    key={cardId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-tarot-gold/30"
                  >
                    <img
                      src={`/api/card-image?id=${cardId}&deck=${currentDeck.id}`}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Back Selector Dialog */}
        <CardBackSelector
          showAsDialog={true}
          isOpen={showCardBackSelector}
          onClose={() => setShowCardBackSelector(false)}
          onSelect={(cardBackId) => {
            audioManager.playRandom('cardFlip');
            gameLogger.logAction('card_back_selected', {
              cardBackId,
              playerId: 'player1'
            }, true, 'Player selected card back');
          }}
        />
      </div>
    </div>
  );
}