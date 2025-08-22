/**
 * PvE Run Progress Management
 * Handles saving and loading player progress through the PvE adventure
 */

import { RunState } from '@/components/game/PvEMap';

export interface PvEProgress {
  runState: RunState;
  currentNodeId: string | null;
  completedNodes: string[];
  totalVictories: number;
  currentStreak: number;
  lastUpdated: string;
}

const STORAGE_KEY = 'pve_run_progress';

/**
 * Save the current PvE run progress to localStorage
 */
export function saveRunProgress(progress: PvEProgress): void {
  try {
    const data = {
      ...progress,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save PvE progress:', error);
  }
}

/**
 * Load the saved PvE run progress from localStorage
 */
export function loadRunProgress(): PvEProgress | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const progress = JSON.parse(saved) as PvEProgress;
    
    // Validate that the save is not too old (24 hours)
    const lastUpdated = new Date(progress.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 24) {
      console.log('PvE progress expired, starting fresh');
      clearRunProgress();
      return null;
    }
    
    return progress;
  } catch (error) {
    console.error('Failed to load PvE progress:', error);
    return null;
  }
}

/**
 * Update progress after a victory
 */
export function updateProgressAfterVictory(
  currentProgress: PvEProgress,
  nodeId: string,
  rewards: { gold?: number; cards?: any[]; relics?: any[] }
): PvEProgress {
  const updated: PvEProgress = {
    ...currentProgress,
    completedNodes: [...currentProgress.completedNodes, nodeId],
    currentNodeId: nodeId,
    totalVictories: currentProgress.totalVictories + 1,
    currentStreak: currentProgress.currentStreak + 1,
    lastUpdated: new Date().toISOString()
  };
  
  // Apply rewards to run state
  if (rewards.gold) {
    updated.runState.gold += rewards.gold;
  }
  
  if (rewards.cards) {
    updated.runState.deck = [...updated.runState.deck, ...rewards.cards];
  }
  
  if (rewards.relics) {
    updated.runState.relics = [...updated.runState.relics, ...rewards.relics];
  }
  
  return updated;
}

/**
 * Update progress after a defeat
 */
export function updateProgressAfterDefeat(currentProgress: PvEProgress): PvEProgress {
  return {
    ...currentProgress,
    currentStreak: 0,
    runState: {
      ...currentProgress.runState,
      health: Math.max(1, Math.floor(currentProgress.runState.maxHealth * 0.5)) // Restore half health on defeat
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Clear all saved progress
 */
export function clearRunProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear PvE progress:', error);
  }
}

/**
 * Check if there's an active run
 */
export function hasActiveRun(): boolean {
  return loadRunProgress() !== null;
}