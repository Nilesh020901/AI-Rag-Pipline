import { PostgresStore, PgVector } from '@mastra/pg';
import { getEnv } from '@/lib/config/env';

let store: PostgresStore | undefined;
let vector: PgVector | undefined;

export function getPostgresStore(): PostgresStore {
  if (!store) {
    const { DATABASE_URL } = getEnv();
    store = new PostgresStore({
      id: 'neon-store',
      connectionString: DATABASE_URL,
      // @ts-ignore - Mastra JS implementation supports this but types are missing
      pgPoolOptions: { connectionTimeoutMillis: 10000 },
    });
  }
  return store;
}

export function getPgVector(): PgVector {
  if (!vector) {
    const { DATABASE_URL } = getEnv();
    vector = new PgVector({
      id: 'neon-pgvector',
      connectionString: DATABASE_URL,
      // @ts-ignore - Mastra JS implementation supports this but types are missing
      pgPoolOptions: { connectionTimeoutMillis: 10000 },
    });
  }
  return vector;
}
