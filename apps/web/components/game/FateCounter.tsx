'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FateCounterProps {
  current: number;
  max: number;
  position?: 'top' | 'bottom';
  label?: string;
}

export function FateCounter({ current, max, position = 'bottom', label = 'Fate' }: FateCounterProps) {
  const gems = Array.from({ length: max }, (_, i) => i < current);

  return (
    <div
      className="flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
      data-testid={`fate-counter-${position}`}
    >
      <span className="text-xs uppercase tracking-wider text-gray-300 font-semibold">{label}</span>
      <Sparkles className="w-5 h-5 text-purple-400" />
      <div className="flex gap-1">
        {gems.map((filled, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{
              scale: filled ? 1 : 0.8,
              rotate: filled ? 360 : 0
            }}
            transition={{
              duration: 0.3,
              delay: index * 0.1,
              type: "spring"
            }}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all duration-300",
              filled
                ? "bg-gradient-to-br from-purple-400 to-pink-400 border-purple-300 shadow-lg shadow-purple-500/50"
                : "bg-gray-800 border-gray-600"
            )}
          >
            {filled && (
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-full h-full rounded-full bg-white/20"
                data-testid={`fate-gem-${index}-${filled ? 'filled' : 'empty'}`}
              />
            )}
          </motion.div>
        ))}
      </div>
      <span className="text-white font-bold text-sm">
        {current}/{max}
      </span>
    </div>
  );
}