'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Settings, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GamePhase } from '@/lib/store/gameStore';

interface TopBarProps {
  matchId: string;
  turn: number;
  phase: GamePhase;
  turnTimer?: number;
}

export function TopBar({ matchId, turn, phase, turnTimer }: TopBarProps) {
  const [timeRemaining, setTimeRemaining] = useState(turnTimer || 0);
  const [showTimer, setShowTimer] = useState(false);

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
    <div className="h-full flex items-center justify-between px-8">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
              <Menu className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
            <DropdownMenuItem>Pause Game</DropdownMenuItem>
            <DropdownMenuItem>Concede</DropdownMenuItem>
            <DropdownMenuItem>Report Issue</DropdownMenuItem>
            <DropdownMenuItem>Exit to Menu</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Center */}
      <div className="flex flex-col items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
          Arcanum Duel
        </h1>
        <div className="text-xs text-white/50">Match: {matchId.substring(0, 8)}</div>
      </div>

      {/* Right Side - Turn Timer */}
      <AnimatePresence>
        {showTimer && timeRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className={`text-lg font-bold ${
              timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
            }`}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}