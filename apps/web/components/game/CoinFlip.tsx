'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { audioManager } from '@/lib/audio/AudioManager';
import { useAnimationDelay } from '@/hooks/useAnimationFrame';

interface CoinFlipProps {
  onComplete: (playerStarts: boolean) => void;
  playerName: string;
  opponentName: string;
}

export function CoinFlip({ onComplete, playerName, opponentName }: CoinFlipProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [playerChoice, setPlayerChoice] = useState<'heads' | 'tails' | null>(null);
  const [showResult, setShowResult] = useState(false);

  const flipStartTimeRef = useRef<number>(0);
  const resultStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  const handleChoice = (choice: 'heads' | 'tails') => {
    setPlayerChoice(choice);
    setIsFlipping(true);
    
    // Play coin flip sound
    audioManager.playRandom('coinFlip');
    
    // Start flip animation with requestAnimationFrame
    flipStartTimeRef.current = 0;
    
    const animateFlip = (timestamp: number) => {
      if (!flipStartTimeRef.current) {
        flipStartTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - flipStartTimeRef.current;
      
      if (elapsed >= 2000) {
        // Flip complete
        const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';
        setResult(flipResult);
        setIsFlipping(false);
        setShowResult(true);
        
        // Determine who goes first
        const playerWins = flipResult === choice;
        
        // Play coin fall sound
        audioManager.playRandom('coinFall');
        
        // Start result display animation
        resultStartTimeRef.current = 0;
        
        const animateResult = (resultTimestamp: number) => {
          if (!resultStartTimeRef.current) {
            resultStartTimeRef.current = resultTimestamp;
          }
          
          const resultElapsed = resultTimestamp - resultStartTimeRef.current;
          
          if (resultElapsed >= 2000) {
            onComplete(playerWins);
          } else {
            animationFrameRef.current = requestAnimationFrame(animateResult);
          }
        };
        
        animationFrameRef.current = requestAnimationFrame(animateResult);
      } else {
        animationFrameRef.current = requestAnimationFrame(animateFlip);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animateFlip);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-b from-purple-900 to-slate-900 rounded-lg p-8 border-2 border-tarot-gold/50 shadow-2xl max-w-md w-full"
        >
          <h2 className="text-3xl font-bold text-tarot-gold text-center mb-6">
            Coin Toss
          </h2>
          
          {!playerChoice ? (
            <div className="space-y-4">
              <p className="text-white text-center mb-6">
                Choose heads or tails to determine who goes first
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleChoice('heads')}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-4 text-lg"
                >
                  Heads
                </Button>
                
                <Button
                  onClick={() => handleChoice('tails')}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 text-lg"
                >
                  Tails
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Coin Animation */}
              <div className="relative w-32 h-32 mb-6">
                <motion.div
                  className="absolute inset-0"
                  animate={isFlipping ? {
                    rotateY: [0, 360, 720, 1080],
                  } : {
                    rotateY: result === 'heads' ? 0 : 180
                  }}
                  transition={isFlipping ? {
                    duration: 2,
                    ease: "easeInOut"
                  } : {
                    duration: 0
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Heads Side */}
                  <div
                    className="absolute inset-0 backface-hidden"
                    style={{
                      backgroundImage: 'url(/api/ui/themes/pixel-pack/others/card_ui_coin.png)',
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated',
                      backfaceVisibility: 'hidden',
                    }}
                  />
                  
                  {/* Tails Side */}
                  <div
                    className="absolute inset-0 backface-hidden"
                    style={{
                      backgroundImage: 'url(/api/ui/themes/pixel-pack/others/card_ui_coin_2.png)',
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  />
                </motion.div>
              </div>
              
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p className="text-white text-lg mb-2">
                    You chose: <span className="text-tarot-gold font-bold">{playerChoice}</span>
                  </p>
                  <p className="text-white text-lg mb-4">
                    Result: <span className="text-tarot-gold font-bold">{result}</span>
                  </p>
                  
                  {result === playerChoice ? (
                    <div>
                      <p className="text-2xl font-bold text-green-400 mb-2">You won the toss!</p>
                      <p className="text-white">You will go first</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-red-400 mb-2">You lost the toss!</p>
                      <p className="text-white">{opponentName} will go first</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}