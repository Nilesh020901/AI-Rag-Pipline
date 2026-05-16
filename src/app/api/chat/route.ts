import { convertToModelMessages, type UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getEnv } from '@/lib/config/env';
import { toPublicErrorMessage } from '@/lib/errors/app-error';
import { mastra } from '@/mastra';
import { ensureMastraReady } from '@/services/mastra/ensure-ready';

export const runtime = 'nodejs';

const bodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  threadId: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    getEnv();
    await ensureMastraReady();

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { messages, threadId: existingThread, resourceId } = parsed.data;
    const threadId = existingThread ?? randomUUID();

    const modelMessages = messages.map((m: any) => {
      let content = m.content;
      if (!content && m.parts && m.parts.length > 0) {
        content = m.parts.map((p: any) => p.text).join(' ');
      }
      return {
        role: m.role,
        content: content || '',
      };
    });
    const agent = mastra.getAgent('berkshireAgent');

    const streamResult = await agent.stream(modelMessages, {
      memory: {
        thread: threadId,
        resource: resourceId ?? 'default-user',
      },
    });

    return new Response(streamResult.textStream as unknown as BodyInit, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Thread-Id': threadId,
      },
    });
  } catch (error) {
    const { message, status } = toPublicErrorMessage(error);
    return NextResponse.json({ error: message }, { status });
  }
}
