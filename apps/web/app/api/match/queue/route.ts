import { NextResponse } from 'next/server';
import { enqueue, processQueue, getResultForUser } from '@/lib/matchStore';
import { stackServerApp } from '@/stack';

export async function POST(req: Request) {
  const body: Record<string, unknown> = await req.json().catch(async () => {
    // attempt form data fallback
    const formDataGetter = (req as unknown as { formData?: () => Promise<FormData> }).formData;
    if (formDataGetter) {
      try {
        const form = await formDataGetter.call(req);
        return Object.fromEntries(form.entries());
      } catch {
        // ignore
      }
    }
    return {} as Record<string, unknown>;
  });

  // Check for authenticated user using Stack
  const user = await stackServerApp.getUser();
  const isAuthenticated = !!user;

  let userId = (body['userId'] as string) ?? 'anon';
  let isGuest = true;

  if (isAuthenticated && user?.id) {
    userId = user.id;
    isGuest = false;
  } else if (userId === 'anon') {
    // Generate a unique guest ID
    userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    isGuest = true;
  }

  enqueue(userId, isGuest);
  await processQueue('mm-seed');
  const result = getResultForUser(userId);

  return NextResponse.json({
    queued: true,
    result,
    userId,
    isGuest,
    isAuthenticated,
    user: isAuthenticated ? { id: user?.id, name: user?.displayName, email: user?.primaryEmail } : null
  });
}
