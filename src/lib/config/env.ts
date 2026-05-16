import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (Neon PostgreSQL connection string)'),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, 'GOOGLE_GENERATIVE_AI_API_KEY is required'),
  /** Optional: protect POST /api/ingest in production */
  INGEST_SECRET: z.string().optional(),
  LETTERS_DIR: z.string().optional().default('data/letters'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  cached = parsed.data;
  return parsed.data;
}
