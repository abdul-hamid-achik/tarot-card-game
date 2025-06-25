import { runHeadlessMatch } from '@tarot/game-sim/dist/index.js';

type MatchStatus = 'queued' | 'running' | 'done';

interface QueueEntry { userId: string; ts: number }
interface MatchRecord { id: string; players: string[]; status: MatchStatus; winnerId: string | null; steps: number }

const queue: QueueEntry[] = [];
const matches = new Map<string, MatchRecord>();
const userToMatch = new Map<string, string>();

export function enqueue(userId: string) {
  queue.push({ userId, ts: Date.now() });
}

export async function processQueue(seed = 'mm-seed') {
  // Pair two players if available
  while (queue.length >= 2) {
    const a = queue.shift()!;
    const b = queue.shift()!;
    const matchId = `m_${a.userId}_${b.userId}_${Date.now()}`;
    const record: MatchRecord = { id: matchId, players: [a.userId, b.userId], status: 'running', winnerId: null, steps: 0 };
    matches.set(matchId, record);
    userToMatch.set(a.userId, matchId);
    userToMatch.set(b.userId, matchId);
    // Kick off simulation asynchronously; do not await for API responsiveness
    void (async () => {
      const res = await runHeadlessMatch(`${seed}:${matchId}`, record.players, 3, 300);
      const done: MatchRecord = { ...record, status: 'done', winnerId: res.winnerId, steps: res.steps };
      matches.set(matchId, done);
    })();
  }
}

export function getResultForUser(userId: string) {
  const matchId = userToMatch.get(userId);
  if (!matchId) return null;
  const rec = matches.get(matchId) || null;
  return rec;
}
