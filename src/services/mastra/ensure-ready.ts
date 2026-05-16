import { mastra } from '@/mastra';
import { PostgresStore } from '@mastra/pg';

let initPromise: Promise<void> | null = null;

/**
 * Mastra Postgres storage must be initialized before agents persist memory.
 */
export function ensureMastraReady(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const storage = mastra.getStorage();
      if (storage instanceof PostgresStore) {
        await storage.init();
      }
    })();
  }
  return initPromise;
}
