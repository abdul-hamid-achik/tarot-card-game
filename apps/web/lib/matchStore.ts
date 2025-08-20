import { runHeadlessMatch } from '@tarot/game-sim/dist/index.js';

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
}

export async function processQueue(seed = 'mm-seed') {
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
      const record: MatchRecord = {
        id: matchId,
        players: [player.userId, otherPlayer.userId],
        status: 'running',
        winnerId: null,
        steps: 0
      };
      matches.set(matchId, record);
      userToMatch.set(player.userId, matchId);
      userToMatch.set(otherPlayer.userId, matchId);

      // Kick off simulation asynchronously
      void (async () => {
        const res = await runHeadlessMatch(`${seed}:${matchId}`, record.players, 3, 300);
        const done: MatchRecord = { ...record, status: 'done', winnerId: res.winnerId, steps: res.steps };
        matches.set(matchId, done);
      })();
    } else if (aiOpponents.length > 0) {
      // No human player available, pair with AI
      const aiOpponent = aiOpponents[Math.floor(Math.random() * aiOpponents.length)];
      const matchId = `m_${player.userId}_${aiOpponent}_${Date.now()}`;
      const record: MatchRecord = {
        id: matchId,
        players: [player.userId, aiOpponent],
        status: 'running',
        winnerId: null,
        steps: 0
      };
      matches.set(matchId, record);
      userToMatch.set(player.userId, matchId);
      userToMatch.set(aiOpponent, matchId);

      // Kick off simulation asynchronously
      void (async () => {
        const res = await runHeadlessMatch(`${seed}:${matchId}`, record.players, 3, 300);
        const done: MatchRecord = { ...record, status: 'done', winnerId: res.winnerId, steps: res.steps };
        matches.set(matchId, done);
      })();
    } else {
      // No AI opponents available, put the player back in queue
      queue.unshift(player);
      break;
    }
  }
}

export function getResultForUser(userId: string) {
  const matchId = userToMatch.get(userId);
  if (!matchId) return null;
  const rec = matches.get(matchId) || null;
  return rec;
}
