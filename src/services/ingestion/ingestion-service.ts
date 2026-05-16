import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { embedMany } from 'ai';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { MDocument } from '@mastra/rag';
import { eq } from 'drizzle-orm';
import { PDFParse } from 'pdf-parse';
import {
  BERKSHIRE_VECTOR_INDEX,
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from '@/lib/config/rag';
import { getDb } from '@/lib/db/client';
import { sourceDocuments } from '@/lib/db/schema';
import { getPgVector } from '@/mastra/infrastructure/postgres';

export type IngestSummary = {
  filesProcessed: number;
  chunksWritten: number;
  errors: string[];
};

function inferYearFromFilename(file: string): number | null {
  const m = file.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return typeof result.text === 'string' ? result.text : '';
  } finally {
    await parser.destroy();
  }
}

export async function ingestLetterPdfsFromDirectory(params: {
  directory: string;
  resetPerFile?: boolean;
}): Promise<IngestSummary> {
  const { directory, resetPerFile = true } = params;
  const absoluteDir = path.isAbsolute(directory)
    ? directory
    : path.join(/* turbopackIgnore: true */ process.cwd(), directory);
  const summary: IngestSummary = { filesProcessed: 0, chunksWritten: 0, errors: [] };

  let entries: string[];
  try {
    entries = await fs.readdir(absoluteDir);
  } catch (e) {
    summary.errors.push(`Cannot read directory ${absoluteDir}: ${e instanceof Error ? e.message : String(e)}`);
    return summary;
  }

  const pdfFiles = entries.filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (pdfFiles.length === 0) {
    summary.errors.push(`No PDF files found in ${absoluteDir}`);
    return summary;
  }

  const store = getPgVector();
  await store.createIndex({
    indexName: BERKSHIRE_VECTOR_INDEX,
    dimension: EMBEDDING_DIMENSIONS,
    metric: 'cosine',
    // @ts-ignore - Mastra supports this but it might not be in types
    buildIndex: false,
  });

  const db = getDb();
  const embeddingModel = new ModelRouterEmbeddingModel(EMBEDDING_MODEL);

  for (const file of pdfFiles) {
    const fullPath = path.join(absoluteDir, file);
    try {
      const existingDoc = await db
        .select()
        .from(sourceDocuments)
        .where(eq(sourceDocuments.filename, file))
        .limit(1);

      if (existingDoc.length > 0) {
        console.log(`Skipping ${file} - already ingested.`);
        summary.filesProcessed += 1;
        continue;
      }

      const buf = await fs.readFile(fullPath);
      const text = (await extractPdfText(buf)).trim();
      if (!text) {
        summary.errors.push(`No text extracted from ${file}`);
        continue;
      }

      const year = inferYearFromFilename(file);
      const doc = MDocument.fromText(text, {
        sourceFile: file,
        year: year ?? undefined,
      });

      const chunks = await doc.chunk({
        strategy: 'recursive',
        maxSize: CHUNK_SIZE,
        overlap: CHUNK_OVERLAP,
        separators: ['\n\n', '\n', ' '],
      });

      if (chunks.length === 0) {
        summary.errors.push(`No chunks for ${file}`);
        continue;
      }

      const batchSize = 50;
      const allEmbeddings = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const { embeddings } = await embedMany({
          model: embeddingModel,
          values: batch.map((c) => c.text),
        });
        allEmbeddings.push(...embeddings);
        
        // Small delay to prevent hitting Gemini rate limits (429/404 errors)
        if (i + batchSize < chunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const metadata = chunks.map((c, index) => ({
        text: c.text,
        sourceFile: file,
        year: year ?? null,
        chunkIndex: index,
      }));

      await store.upsert({
        indexName: BERKSHIRE_VECTOR_INDEX,
        vectors: allEmbeddings,
        metadata,
        ...(resetPerFile
          ? {
              deleteFilter: { sourceFile: file },
            }
          : {}),
      });

      await db
        .insert(sourceDocuments)
        .values({
          filename: file,
          year: year ?? null,
          chunkCount: chunks.length,
        })
        .onConflictDoUpdate({
          target: sourceDocuments.filename,
          set: {
            year: year ?? null,
            chunkCount: chunks.length,
            ingestedAt: new Date(),
          },
        });

      summary.filesProcessed += 1;
      summary.chunksWritten += chunks.length;
    } catch (e) {
      summary.errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return summary;
}

/** Optional cleanup helper for tests or re-ingest from scratch */
export async function deleteVectorsForFile(filename: string): Promise<void> {
  const store = getPgVector();
  await store.deleteVectors({
    indexName: BERKSHIRE_VECTOR_INDEX,
    filter: { sourceFile: filename },
  });
  const db = getDb();
  await db.delete(sourceDocuments).where(eq(sourceDocuments.filename, filename));
}
