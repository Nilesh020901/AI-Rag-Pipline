import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnv } from '@/lib/config/env';
import { AppError, toPublicErrorMessage } from '@/lib/errors/app-error';
import { ingestLetterPdfsFromDirectory } from '@/services/ingestion/ingestion-service';
import { ensureMastraReady } from '@/services/mastra/ensure-ready';

export const runtime = 'nodejs';

const bodySchema = z.object({
  directory: z.string().optional(),
  resetSource: z.boolean().optional(),
});

function assertIngestAuthorized(req: Request, secret: string | undefined) {
  if (!secret) {
    return;
  }
  const header = req.headers.get('x-ingest-secret');
  if (header !== secret) {
    throw new AppError('Forbidden', 'Not allowed to ingest', 403);
  }
}

export async function POST(req: Request) {
  try {
    const env = getEnv();
    assertIngestAuthorized(req, env.INGEST_SECRET);
    await ensureMastraReady();

    const json: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const directory = parsed.data.directory ?? env.LETTERS_DIR;
    const summary = await ingestLetterPdfsFromDirectory({
      directory,
      resetPerFile: parsed.data.resetSource ?? true,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const { message, status } = toPublicErrorMessage(error);
    return NextResponse.json({ error: message }, { status });
  }
}
