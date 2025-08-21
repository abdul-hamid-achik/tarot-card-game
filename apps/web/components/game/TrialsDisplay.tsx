'use client';

import { motion } from 'framer-motion';
import { Trophy, Sun, Moon, Scale } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trial } from '@/lib/store/gameStore';
import { cn } from '@/lib/utils';

interface TrialsDisplayProps {
  trials: Trial[];
  playerName: string;
}

export function TrialsDisplay({ trials, playerName }: TrialsDisplayProps) {
  const getTrialIcon = (trialName: string) => {
    if (trialName.includes('Sun')) return <Sun className="w-4 h-4" />;
    if (trialName.includes('Moon')) return <Moon className="w-4 h-4" />;
    if (trialName.includes('Judgement')) return <Scale className="w-4 h-4" />;
    return <Trophy className="w-4 h-4" />;
  };

  const completedCount = trials.filter(t => t.completed).length;

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-white/20 min-w-[200px]" data-testid="trials-display">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">Arcana Trials</h3>
        <Badge variant="outline" className="text-yellow-400 border-yellow-400" data-testid="trials-completed">
          {completedCount}/3
        </Badge>
      </div>

      <div className="space-y-2">
        {trials.map((trial, index) => (
          <motion.div
            key={trial.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative rounded-lg p-2 border transition-all",
              trial.completed 
                ? "bg-green-900/30 border-green-500/50" 
                : "bg-gray-900/30 border-gray-700/50"
            )}
            data-testid={`trial-${trial.id}-${trial.completed ? 'done' : 'pending'}`}
          >
            <div className="flex items-start gap-2">
              <div className={cn(
                "p-1 rounded",
                trial.completed ? "text-green-400" : "text-gray-400"
              )}>
                {getTrialIcon(trial.name)}
              </div>
              
              <div className="flex-1">
                <h4 className={cn(
                  "text-xs font-semibold mb-1",
                  trial.completed ? "text-green-400" : "text-white"
                )}>
                  {trial.name}
                </h4>
                <p className="text-xs text-gray-400 mb-2">
                  {trial.requirement}
                </p>
                
                {!trial.completed && (
                  <div className="space-y-1">
                    <Progress 
                      value={(trial.progress / trial.maxProgress) * 100} 
                      className="h-1"
                      data-testid={`trial-progress-${trial.id}`}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {trial.progress}/{trial.maxProgress}
                    </div>
                  </div>
                )}
                
                {trial.completed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-xs text-green-400 font-bold"
                  >
                    ✓ Complete!
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {completedCount === 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 text-center"
        >
          <div className="text-yellow-400 font-bold text-sm animate-pulse">
            Victory Imminent!
          </div>
        </motion.div>
      )}
    </div>
  );
}