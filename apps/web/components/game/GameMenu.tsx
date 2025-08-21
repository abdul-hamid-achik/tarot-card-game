'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  X, 
  Flag, 
  LogOut, 
  Volume2, 
  VolumeX,
  Home,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/lib/store/gameStore';
import { audioManager } from '@/lib/audio/AudioManager';
import { gameLogger } from '@tarot/game-logger';

export function GameMenu() {
  const router = useRouter();
  const { currentMatch, endMatch } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const handleConcede = () => {
    gameLogger.logAction('concede_match', {
      matchId: currentMatch?.matchId,
      turn: currentMatch?.turn,
      phase: currentMatch?.phase
    }, true, 'Player conceded the match');
    
    // End the match with defeat
    if (endMatch) {
      endMatch('defeat');
    }
    
    // Navigate based on match type
    if (currentMatch?.type === 'pve') {
      router.push('/play/pve');
    } else {
      router.push('/');
    }
    
    setIsOpen(false);
  };

  const handleAbandonRun = () => {
    gameLogger.logAction('abandon_run', {
      matchId: currentMatch?.matchId,
      type: currentMatch?.type
    }, true, 'Player abandoned the run');
    
    // Clear any run progress (in a real implementation)
    localStorage.removeItem('pve_run_progress');
    
    // End match and return to main menu
    if (endMatch) {
      endMatch('abandon');
    }
    
    router.push('/');
    setIsOpen(false);
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (newMuted) {
      audioManager.mute();
    } else {
      audioManager.unmute();
    }
    
    gameLogger.logAction('toggle_audio', {
      muted: newMuted
    }, true, `Audio ${newMuted ? 'muted' : 'unmuted'}`);
  };

  const handleReturnToMenu = () => {
    router.push('/');
    setIsOpen(false);
  };

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed top-4 right-4 z-40",
          "p-3 rounded-lg",
          "bg-black/50 backdrop-blur-sm",
          "border border-white/20",
          "hover:bg-black/70 hover:border-white/30",
          "transition-all duration-200",
          "group"
        )}
        aria-label="Game Menu"
      >
        <Settings className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 100 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 100 }}
              className="fixed right-4 top-20 z-50 w-80"
            >
              <div className="bg-gradient-to-br from-tarot-board-dark to-tarot-mystic-purple rounded-xl shadow-2xl border border-tarot-gold/30 overflow-hidden">
                {/* Header */}
                <div className="bg-black/50 px-6 py-4 border-b border-tarot-gold/20 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Game Menu</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Menu Options */}
                <div className="p-4 space-y-2">
                  {/* Audio Toggle */}
                  <button
                    onClick={handleToggleMute}
                    className={cn(
                      "w-full p-3 rounded-lg",
                      "bg-black/30 hover:bg-black/50",
                      "border border-white/10 hover:border-white/20",
                      "text-white text-left",
                      "transition-all duration-200",
                      "flex items-center gap-3"
                    )}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-red-400" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-green-400" />
                    )}
                    <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
                  </button>

                  {/* Restart Match (if applicable) */}
                  {currentMatch && (
                    <button
                      onClick={() => window.location.reload()}
                      className={cn(
                        "w-full p-3 rounded-lg",
                        "bg-black/30 hover:bg-black/50",
                        "border border-white/10 hover:border-white/20",
                        "text-white text-left",
                        "transition-all duration-200",
                        "flex items-center gap-3"
                      )}
                    >
                      <RotateCcw className="w-5 h-5 text-blue-400" />
                      <span>Restart Match</span>
                    </button>
                  )}

                  {/* Concede Match */}
                  {currentMatch && (
                    <button
                      onClick={() => setShowConcedeConfirm(true)}
                      className={cn(
                        "w-full p-3 rounded-lg",
                        "bg-red-900/30 hover:bg-red-900/50",
                        "border border-red-500/30 hover:border-red-500/50",
                        "text-white text-left",
                        "transition-all duration-200",
                        "flex items-center gap-3"
                      )}
                    >
                      <Flag className="w-5 h-5 text-red-400" />
                      <span>Concede Match</span>
                    </button>
                  )}

                  {/* Abandon Run (PvE only) */}
                  {currentMatch?.type === 'pve' && (
                    <button
                      onClick={() => setShowAbandonConfirm(true)}
                      className={cn(
                        "w-full p-3 rounded-lg",
                        "bg-orange-900/30 hover:bg-orange-900/50",
                        "border border-orange-500/30 hover:border-orange-500/50",
                        "text-white text-left",
                        "transition-all duration-200",
                        "flex items-center gap-3"
                      )}
                    >
                      <LogOut className="w-5 h-5 text-orange-400" />
                      <span>Abandon Run</span>
                    </button>
                  )}

                  {/* Return to Main Menu */}
                  <button
                    onClick={handleReturnToMenu}
                    className={cn(
                      "w-full p-3 rounded-lg",
                      "bg-black/30 hover:bg-black/50",
                      "border border-white/10 hover:border-white/20",
                      "text-white text-left",
                      "transition-all duration-200",
                      "flex items-center gap-3"
                    )}
                  >
                    <Home className="w-5 h-5 text-gray-400" />
                    <span>Main Menu</span>
                  </button>
                </div>

                {/* Match Info */}
                {currentMatch && (
                  <div className="px-6 py-4 border-t border-tarot-gold/20 bg-black/30">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Match ID: {currentMatch.matchId.slice(0, 8)}...</div>
                      <div>Turn: {currentMatch.turn}</div>
                      <div>Phase: {currentMatch.phase}</div>
                      <div>Type: {currentMatch.type || 'Classic'}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Concede Confirmation Dialog */}
            <AnimatePresence>
              {showConcedeConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60"
                >
                  <div className="bg-gradient-to-br from-red-900 to-black rounded-xl shadow-2xl border border-red-500/50 p-6 max-w-md">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                      <h3 className="text-xl font-bold text-white">Concede Match?</h3>
                    </div>
                    <p className="text-gray-300 mb-6">
                      Are you sure you want to concede this match? This will count as a loss.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleConcede();
                          setShowConcedeConfirm(false);
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Yes, Concede
                      </button>
                      <button
                        onClick={() => setShowConcedeConfirm(false)}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Keep Playing
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Abandon Run Confirmation Dialog */}
            <AnimatePresence>
              {showAbandonConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60"
                >
                  <div className="bg-gradient-to-br from-orange-900 to-black rounded-xl shadow-2xl border border-orange-500/50 p-6 max-w-md">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-8 h-8 text-orange-400" />
                      <h3 className="text-xl font-bold text-white">Abandon Run?</h3>
                    </div>
                    <p className="text-gray-300 mb-6">
                      Are you sure you want to abandon this run? You will lose all progress and rewards from this adventure.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleAbandonRun();
                          setShowAbandonConfirm(false);
                        }}
                        className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                      >
                        Yes, Abandon
                      </button>
                      <button
                        onClick={() => setShowAbandonConfirm(false)}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Continue Run
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </>
  );
}