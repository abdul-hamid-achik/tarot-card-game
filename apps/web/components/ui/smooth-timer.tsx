'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SmoothTimerProps {
  duration: number; // in seconds
  onComplete?: () => void;
  isActive?: boolean;
  showWarning?: boolean;
  warningThreshold?: number; // seconds remaining to show warning
  className?: string;
  format?: 'mm:ss' | 'ss';
}

export function SmoothTimer({
  duration,
  onComplete,
  isActive = true,
  showWarning = true,
  warningThreshold = 30,
  className,
  format = 'mm:ss'
}: SmoothTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();
  const lastSecondRef = useRef<number>(duration);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000; // Convert to seconds
      const remaining = Math.max(0, duration - elapsed);
      const currentSecond = Math.floor(remaining);

      // Only update state when the second changes to avoid unnecessary re-renders
      if (currentSecond !== lastSecondRef.current) {
        lastSecondRef.current = currentSecond;
        setTimeRemaining(currentSecond);
        
        if (showWarning && currentSecond <= warningThreshold && currentSecond > 0) {
          setIsWarning(true);
        }

        if (currentSecond === 0 && onComplete) {
          onComplete();
        }
      }

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [duration, isActive, onComplete, showWarning, warningThreshold]);

  const formatTime = (seconds: number): string => {
    if (format === 'ss') {
      return seconds.toString();
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span 
      className={cn(
        'font-mono transition-colors duration-200',
        isWarning && 'text-red-500 animate-pulse',
        className
      )}
    >
      {formatTime(timeRemaining)}
    </span>
  );
}

/**
 * Hook version for more control
 */
export function useSmoothTimer(duration: number, isActive: boolean = true) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      startTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      const progressValue = Math.min(1, elapsed / duration);

      setTimeRemaining(remaining);
      setProgress(progressValue);

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [duration, isActive]);

  return { timeRemaining, progress };
}