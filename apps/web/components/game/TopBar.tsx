'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Clock, Pause, Flag, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface TopBarProps {
  matchId: string;
  turn: number;
  phase: GamePhase;
  turnTimer?: number;
}

export function TopBar({ matchId, turn, phase, turnTimer }: TopBarProps) {
  const router = useRouter();
  const { disconnect, updateMatch } = useGameStore();
  const [timeRemaining, setTimeRemaining] = useState(turnTimer || 0);
  const [showTimer, setShowTimer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showConcedeDialog, setShowConcedeDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);

  useEffect(() => {
    if (turnTimer && turnTimer > 0) {
      setTimeRemaining(turnTimer);
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 31) setShowTimer(true);
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [turnTimer]);

  return (
    <>
      <div className="h-full grid grid-cols-3 items-center px-8">
        {/* Left Side */}
        <div className="flex items-center gap-4 justify-self-start">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
              <DropdownMenuItem
                onClick={() => setShowPauseDialog(true)}
                className="cursor-pointer hover:bg-white/10"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Game
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowConcedeDialog(true)}
                className="cursor-pointer hover:bg-white/10 text-red-400"
              >
                <Flag className="w-4 h-4 mr-2" />
                Concede
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => window.open('https://github.com/anthropics/claude-code/issues', '_blank')}
                className="cursor-pointer hover:bg-white/10"
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
              >
                <LogOut className="w-4 h-4 mr-2" />
                Exit to Menu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center px-8 justify-self-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Arcanum Duel
          </h1>
          <div className="text-xs text-white/50">Match: {matchId.substring(0, 8)}</div>
        </div>

        {/* Right Side - Turn Timer */}
        <div className="justify-self-end px-8">
          <AnimatePresence>
            {showTimer && timeRemaining > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className={`text-lg font-bold ${timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
                  }`}>
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
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
            >
              Concede Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}