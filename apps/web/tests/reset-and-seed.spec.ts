import { test, expect } from '@playwright/test';

test('reset then seed yields predictable counts', async ({ request }) => {
  await request.post('http://localhost:3000/api/admin/reset-db');
  const res1 = await request.get('http://localhost:3000/api/cards');
  const before = await res1.json();
  expect((before.cards as any[]).length).toBeGreaterThanOrEqual(1); // initial seed contains swords_02

  await request.post('http://localhost:3000/api/admin/seed-cards');
  const after = await (await request.get('http://localhost:3000/api/cards')).json();
  expect((after.cards as any[]).length).toBeGreaterThanOrEqual((before.cards as any[]).length);
});
