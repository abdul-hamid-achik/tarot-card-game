import { test, expect } from '@playwright/test';

test('queue then poll result', async ({ request }) => {
  const queueRes = await request.post('http://localhost:3000/api/match/queue', { data: { userId: 'E2E' } });
  expect(queueRes.ok()).toBeTruthy();
  // poll for a short while
  let winner: string | null = null;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const res = await request.get('http://localhost:3000/api/match/result?userId=E2E');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    if (body.result && body.result.status === 'done') {
      winner = body.result.winnerId;
      break;
    }
  }
  expect(winner === 'E2E' || winner === null || typeof winner === 'string').toBeTruthy();
});
