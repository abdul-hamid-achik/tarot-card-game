import { test, expect } from '@playwright/test';

test('run headless demo', async ({ request }) => {
  const res = await request.post('http://localhost:3000/api/demo/headless', { data: { seed: 'seed-demo' } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty('steps');
});
