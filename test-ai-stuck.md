# AI Stuck Issue Analysis

## Problem
After turn 1, the AI stops playing cards even though it's its turn.

## Log Analysis
1. Turn 1 - Player has attack token:
   - Player plays The Fool
   - Player passes → AI gets priority
   - AI passes → Both passed, round ends
   - Attack token switches to AI

2. Turn 2 - AI has attack token:  
   - AI plays The Fool  
   - Priority passes to player
   - But there's an "ai_skip_play" log right after
   - Player passes → AI gets priority
   - Player passes again → Round ends
   
3. Turn 3 - Player has attack token:
   - Player passes → AI gets priority
   - AI plays The Magician
   - There's another "ai_skip_play" after playing
   - This pattern continues

## Issues Found

### 1. Duplicate AI Logic
There are TWO AI systems running:
- `executeAITurn()` in gameStore.ts
- `handleAITurn()` in TutorialPlayground.tsx

The TutorialPlayground one calls `ai.decideCardToPlay()` which logs "ai_skip_play" even after playing.

### 2. Priority Passing Confusion
When AI plays a card, priority should pass to player automatically via the `playCard()` method. But the AI handler is also trying to pass/end turn.

### 3. Turn Tracking
The `lastAITurnRef` prevents re-execution within the same turn, but after priority passes back and forth, the AI might need to act again in the same turn number.

## Solution
The AI should:
1. Play ONE card when it has priority
2. Let priority pass naturally (don't call endTurn after playing)
3. Only call endTurn when it has nothing to do (pass priority)
4. Track by priority passes, not just turn number