import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '@/lib/config/env';
import * as schema from '@/lib/db/schema';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const { DATABASE_URL } = getEnv();
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

export function getDb() {
  return drizzle(getDbPool(), { schema });
}
