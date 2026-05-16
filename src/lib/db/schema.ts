import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Tracks ingested PDF sources. Vector chunks live in Mastra's pgvector tables.
 */
export const sourceDocuments = pgTable('source_documents', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull().unique(),
  year: integer('year'),
  chunkCount: integer('chunk_count').notNull().default(0),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SourceDocument = typeof sourceDocuments.$inferSelect;
export type NewSourceDocument = typeof sourceDocuments.$inferInsert;
