import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for requestAnimationFrame-based animations
 * @param callback - Function to call on each frame with elapsed time
 * @param duration - Total duration in ms (optional, runs indefinitely if not provided)
 * @param deps - Dependencies array for the callback
 */
export function useAnimationFrame(
  callback: (progress: number, deltaTime: number) => void,
  duration?: number,
  deps: React.DependencyList = []
) {
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback((currentTime: number) => {
    if (startTimeRef.current === undefined) {
      startTimeRef.current = currentTime;
      previousTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    const deltaTime = currentTime - (previousTimeRef.current || currentTime);
    previousTimeRef.current = currentTime;

    if (duration) {
      const progress = Math.min(elapsed / duration, 1);
      callback(progress, deltaTime);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    } else {
      callback(elapsed, deltaTime);
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [callback, duration]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [...deps, animate]);
}

/**
 * Hook for delayed animations using requestAnimationFrame
 * More accurate than setTimeout for visual timing
 */
export function useAnimationDelay(delay: number, callback: () => void, deps: React.DependencyList = []) {
  const startTimeRef = useRef<number>();
  const requestRef = useRef<number>();

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;

      if (elapsed >= delay) {
        callback();
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [delay, callback, ...deps]);
}

/**
 * Hook for smooth countdown timer using requestAnimationFrame
 */
export function useCountdownTimer(
  initialTime: number,
  onComplete?: () => void,
  isActive: boolean = true
) {
  const [timeRemaining, setTimeRemaining] = useRef(initialTime);
  const lastUpdateRef = useRef<number>();

  useAnimationFrame(
    (elapsed) => {
      if (!isActive) return;

      const currentSecond = Math.floor(elapsed / 1000);
      const lastSecond = lastUpdateRef.current || 0;

      if (currentSecond > lastSecond) {
        lastUpdateRef.current = currentSecond;
        const newTime = Math.max(0, initialTime - currentSecond);
        setTimeRemaining(newTime);

        if (newTime === 0 && onComplete) {
          onComplete();
        }
      }
    },
    undefined,
    [initialTime, isActive]
  );

  return timeRemaining.current;
}