import { NextResponse } from 'next/server';
import { BERKSHIRE_VECTOR_INDEX } from '@/lib/config/rag';
import { toPublicErrorMessage } from '@/lib/errors/app-error';
import { getPgVector } from '@/mastra/infrastructure/postgres';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const store = getPgVector();
    const indexes = await store.listIndexes();
    let vectorChunks: number | null = null;
    if (indexes.includes(BERKSHIRE_VECTOR_INDEX)) {
      const stats = await store.describeIndex({ indexName: BERKSHIRE_VECTOR_INDEX });
      vectorChunks = stats.count;
    }
    return NextResponse.json({
      ok: true,
      vectorIndex: BERKSHIRE_VECTOR_INDEX,
      indexes,
      vectorChunks,
    });
  } catch (error) {
    const { message, status } = toPublicErrorMessage(error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
