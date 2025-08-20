'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, X, Users, Sparkles } from 'lucide-react';
import { useGameStore } from '@/lib/store/gameStore';
import { gameWebSocket } from '@/lib/websocket/GameWebSocket';

interface MatchmakingOverlayProps {
  isOpen: boolean;
  onCancel: () => void;
  deckId?: string;
}

export function MatchmakingOverlay({ isOpen, onCancel, deckId }: MatchmakingOverlayProps) {
  const [searchTime, setSearchTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(15);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const { isSearchingMatch, setSearchingMatch } = useGameStore();

  useEffect(() => {
    if (isOpen && !isSearchingMatch) {
      startMatchmaking();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isSearchingMatch) {
      const interval = setInterval(() => {
        setSearchTime((prev) => prev + 1);
        // Simulate players in queue
        setPlayersInQueue(Math.floor(Math.random() * 20) + 5);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isSearchingMatch]);

  const startMatchmaking = async () => {
    setSearchingMatch(true);
    setSearchTime(0);

    // Connect to WebSocket if not connected
    if (!gameWebSocket.isConnected()) {
      gameWebSocket.connect();
    }

    // Start matchmaking via API
    try {
      const response = await fetch('/api/match/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'player1', // This should come from auth
          deckId: deckId || 'default-deck'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to queue for match');
      }

      const data = await response.json();
      console.log('Queued for match:', data);
    } catch (error) {
      console.error('Matchmaking error:', error);
      setSearchingMatch(false);
      onCancel();
    }
  };

  const cancelMatchmaking = () => {
    setSearchingMatch(false);
    gameWebSocket.disconnect();
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && cancelMatchmaking()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30">
        <div className="relative">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelMatchmaking}
            className="absolute -top-2 -right-2 text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Content */}
          <div className="flex flex-col items-center py-6">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-1"
              >
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                  <Users className="w-12 h-12 text-purple-400" />
                </div>
              </motion.div>
              
              {/* Pulsing Ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-purple-400"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Finding Opponent</h2>
            
            {/* Search Time */}
            <div className="text-sm text-gray-400 mb-4">
              Searching for {formatTime(searchTime)}
            </div>

            {/* Progress Bar */}
            <div className="w-full mb-4">
              <Progress 
                value={(searchTime / estimatedTime) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Est. time: ~{estimatedTime}s</span>
                <span>{playersInQueue} players in queue</span>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-black/30 rounded-lg p-4 w-full mb-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-semibold mb-1">Quick Tip:</p>
                  <p className="text-xs">
                    {searchTime < 10 
                      ? "Remember to flip your cards for different effects!"
                      : searchTime < 20
                      ? "Complete Arcana Trials for instant victory!"
                      : "Fate points can be used to manipulate card orientations!"}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelMatchmaking}
                className="bg-transparent text-white border-white/20 hover:bg-white/10"
              >
                Cancel Search
              </Button>
              
              {searchTime > 30 && (
                <Button
                  onClick={() => {
                    // Queue with AI opponent
                    window.location.href = '/play/pve';
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Play vs AI Instead
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}