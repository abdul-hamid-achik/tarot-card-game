import { runHeadlessMatch } from '@tarot/game-sim/dist/index.js';
import { gameLogger } from '@tarot/game-logger';

type MatchStatus = 'queued' | 'running' | 'done';

interface QueueEntry { userId: string; ts: number; isGuest: boolean }
interface MatchRecord { id: string; players: string[]; status: MatchStatus; winnerId: string | null; steps: number }

const queue: QueueEntry[] = [];
const matches = new Map<string, MatchRecord>();
const userToMatch = new Map<string, string>();

// AI opponents pool
const AI_OPPONENTS = ['ai_alex', 'ai_bob', 'ai_charlie', 'ai_diana', 'ai_eve'];

export function enqueue(userId: string, isGuest = false) {
  queue.push({ userId, ts: Date.now(), isGuest });
  gameLogger.logAction('player_enqueue', {
    userId,
    isGuest,
    queueLength: queue.length
  }, true, 'Player added to matchmaking queue');
}

export async function processQueue(seed = 'mm-seed') {
  gameLogger.logAction('process_queue_start', {
    queueLength: queue.length,
    availableAIOpponents: AI_OPPONENTS.filter(ai => !userToMatch.has(ai)).length,
    seed
  }, true, 'Starting queue processing');

  // Always ensure there's at least one AI opponent available
  const aiOpponents = AI_OPPONENTS.filter(ai => !userToMatch.has(ai));

  // Pair players or create matches with AI
  while (queue.length > 0) {
    const player = queue.shift()!;

    // Look for another human player first
    const otherPlayerIndex = queue.findIndex(p => !p.isGuest);
    if (otherPlayerIndex !== -1) {
      // Found another human player - create PvP match
      const otherPlayer = queue.splice(otherPlayerIndex, 1)[0];
      const matchId = `m_${player.userId}_${otherPlayer.userId}_${Date.now()}`;
      const record: MatchRecord & { ts: number } = {
        id: matchId,
        players: [player.userId, otherPlayer.userId],
        status: 'running',
        winnerId: null,
        steps: 0,
        ts: Date.now()
      };
      matches.set(matchId, record);
      userToMatch.set(player.userId, matchId);
      userToMatch.set(otherPlayer.userId, matchId);

      gameLogger.logGameState('MATCH_START', {
        matchId,
        type: 'pvp',
        players: [player.userId, otherPlayer.userId],
        player1Guest: player.isGuest,
        player2Guest: otherPlayer.isGuest
      });

      // Kick off simulation asynchronously
      void (async () => {
        const res = await runHeadlessMatch(`${seed}:${matchId}`, record.players, 3, 300);
        const done: MatchRecord = { ...record, status: 'done', winnerId: res.winnerId, steps: res.steps };
        matches.set(matchId, done);

        gameLogger.logGameState('MATCH_END', {
          matchId,
          winnerId: res.winnerId,
          steps: res.steps,
          duration: Date.now() - record.ts
        });
      })();
    } else if (aiOpponents.length > 0) {
      // No human player available, pair with AI
      const aiOpponent = aiOpponents[Math.floor(Math.random() * aiOpponents.length)];
      const matchId = `m_${player.userId}_${aiOpponent}_${Date.now()}`;
      const record: MatchRecord & { ts: number } = {
        id: matchId,
        players: [player.userId, aiOpponent],
        status: 'running',
        winnerId: null,
        steps: 0,
        ts: Date.now()
      };
      matches.set(matchId, record);
      userToMatch.set(player.userId, matchId);
      userToMatch.set(aiOpponent, matchId);

      gameLogger.logGameState('MATCH_START', {
        matchId,
        type: 'pve',
        players: [player.userId, aiOpponent],
        aiOpponent,
        playerGuest: player.isGuest
      });

      // Kick off simulation asynchronously
      void (async () => {
        const res = await runHeadlessMatch(`${seed}:${matchId}`, record.players, 3, 300);
        const done: MatchRecord = { ...record, status: 'done', winnerId: res.winnerId, steps: res.steps };
        matches.set(matchId, done);

        gameLogger.logGameState('MATCH_END', {
          matchId,
          winnerId: res.winnerId,
          steps: res.steps,
          duration: Date.now() - record.ts
        });
      })();
    } else {
      // No AI opponents available, put the player back in queue
      queue.unshift(player);
      gameLogger.logAction('player_requeued', {
        userId: player.userId,
        isGuest: player.isGuest,
        queueLength: queue.length,
        reason: 'No AI opponents available'
      }, false, 'Player requeued due to no available AI opponents');
      break;
    }
  }

  gameLogger.logAction('process_queue_complete', {
    remainingQueueLength: queue.length,
    activeMatches: matches.size,
    activeUsers: userToMatch.size
  }, true, 'Queue processing completed');
}

export function getResultForUser(userId: string) {
  const matchId = userToMatch.get(userId);
  if (!matchId) {
    gameLogger.logAction('get_result_no_match', { userId }, false, 'No match found for user');
    return null;
  }

  const rec = matches.get(matchId) || null;
  gameLogger.logAction('get_result_success', {
    userId,
    matchId,
    status: rec?.status,
    winnerId: rec?.winnerId
  }, true, 'Match result retrieved');

  return rec;
}
