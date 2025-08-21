'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Clock, Pause, Flag, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmoothTimer } from '@/components/ui/smooth-timer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GamePhase } from '@/lib/store/gameStore';
import { useGameStore } from '@/lib/store/gameStore';
// Removed TrialsDisplay from TopBar; it will be shown in GameBoard top-left

interface TopBarProps {
  matchId: string;
  turn: number;
  phase: GamePhase;
  turnTimer?: number;
}

export function TopBar({ matchId, turn, phase, turnTimer }: TopBarProps) {
  const router = useRouter();
  const { disconnect, updateMatch, endTurn } = useGameStore();
  const [showTimer, setShowTimer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showConcedeDialog, setShowConcedeDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);

  useEffect(() => {
    if (turnTimer && turnTimer > 0 && turnTimer <= 30) {
      setShowTimer(true);
    }
  }, [turnTimer]);

  return (
    <>
      <div className="h-full grid grid-cols-3 items-center px-8" data-testid="top-bar">
        {/* Left Side */}
        <div className="flex items-center gap-4 justify-self-start">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" data-testid="btn-menu">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
              <DropdownMenuItem
                onClick={() => setShowPauseDialog(true)}
                className="cursor-pointer hover:bg-white/10"
                data-testid="menu-pause"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Game
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowConcedeDialog(true)}
                className="cursor-pointer hover:bg-white/10 text-red-400"
                data-testid="menu-concede"
              >
                <Flag className="w-4 h-4 mr-2" />
                Concede
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => window.open('https://github.com/anthropics/claude-code/issues', '_blank')}
                className="cursor-pointer hover:bg-white/10"
                data-testid="menu-report-issue"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Report Issue
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  disconnect();
                  router.push('/play');
                }}
                className="cursor-pointer hover:bg-white/10"
                data-testid="menu-exit"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Exit to Menu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center px-8 justify-self-center" data-testid="match-info">
          <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Arcanum Duel
          </h1>
          <div className="text-xs text-white/50">Match: {matchId.substring(0, 8)}</div>
        </div>

        {/* Right Side - Turn Timer */}
        <div className="justify-self-end px-8" data-testid="turn-timer">
          <AnimatePresence>
            {turnTimer && turnTimer > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Clock className="w-5 h-5 text-yellow-400" />
                <SmoothTimer
                  key={turn}
                  duration={turnTimer}
                  onComplete={() => {
                    // Auto-pass on timeout with turn rope
                    try { endTurn(); } catch (_) { /* no-op */ }
                  }}
                  isActive={!isPaused}
                  warningThreshold={10}
                  className="text-lg font-bold text-yellow-400"
                  format="mm:ss"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-400">Game Paused</DialogTitle>
            <DialogDescription className="text-gray-300">
              The game has been paused. Your opponent has been notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPauseDialog(false)}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
              data-testid="btn-resume-game"
            >
              Resume Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concede Dialog */}
      <Dialog open={showConcedeDialog} onOpenChange={setShowConcedeDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-red-400">Concede Match?</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to concede? This will count as a loss and end the match immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConcedeDialog(false)}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
              data-testid="btn-continue-playing"
            >
              Continue Playing
            </Button>
            <Button
              onClick={() => {
                // In a real implementation, this would notify the server
                disconnect();
                router.push('/play/pve');
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="btn-concede-confirm"
            >
              Concede Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}