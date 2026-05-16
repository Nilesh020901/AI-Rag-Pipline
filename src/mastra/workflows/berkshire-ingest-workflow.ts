import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  ingestLetterPdfsFromDirectory,
  type IngestSummary,
} from '@/services/ingestion/ingestion-service';

const ingestLetters = createStep({
  id: 'ingest-berkshire-pdfs',
  description: 'Load PDF letters from disk, chunk with MDocument, embed, and upsert into pgvector',
  inputSchema: z.object({
    directory: z.string().describe('Folder containing PDF shareholder letters'),
    resetSource: z
      .boolean()
      .optional()
      .describe('When true, replaces vectors for each file before upserting'),
  }),
  outputSchema: z.object({
    filesProcessed: z.number(),
    chunksWritten: z.number(),
    errors: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Missing workflow input');
    }
    const summary: IngestSummary = await ingestLetterPdfsFromDirectory({
      directory: inputData.directory,
      resetPerFile: inputData.resetSource ?? true,
    });
    return {
      filesProcessed: summary.filesProcessed,
      chunksWritten: summary.chunksWritten,
      errors: summary.errors,
    };
  },
});

const berkshireIngestWorkflow = createWorkflow({
  id: 'berkshire-ingest-workflow',
  inputSchema: z.object({
    directory: z.string(),
    resetSource: z.boolean().optional(),
  }),
  outputSchema: z.object({
    filesProcessed: z.number(),
    chunksWritten: z.number(),
    errors: z.array(z.string()),
  }),
}).then(ingestLetters);

berkshireIngestWorkflow.commit();

export { berkshireIngestWorkflow };
