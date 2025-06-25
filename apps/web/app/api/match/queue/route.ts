import { NextResponse } from 'next/server';
import { enqueue, processQueue, getResultForUser } from '@/lib/matchStore';

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
  const userId = (body['userId'] as string) ?? 'anon';
  enqueue(userId);
  await processQueue('mm-seed');
  const result = getResultForUser(userId);
  return NextResponse.json({ queued: true, result });
}
