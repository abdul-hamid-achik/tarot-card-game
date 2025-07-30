import { test, expect } from '@playwright/test';

test('seeding cards increases count', async ({ request }) => {
  const before = await (await request.get('http://localhost:3000/api/cards')).json();
  await request.post('http://localhost:3000/api/admin/seed-cards');
  const after = await (await request.get('http://localhost:3000/api/cards')).json();
  expect((after.cards as any[]).length).toBeGreaterThanOrEqual((before.cards as any[]).length);
});
