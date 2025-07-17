import { test, expect } from '@playwright/test';

test('cards endpoint returns seeded card from DB', async ({ request }) => {
  const res = await request.get('http://localhost:3000/api/cards');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const ids = (body.cards as any[]).map((c) => c.id);
  expect(ids).toContain('swords_02');
});
