import 'dotenv/config';

import { getEnv } from '@/lib/config/env';
import { ingestLetterPdfsFromDirectory } from '@/services/ingestion/ingestion-service';
import { ensureMastraReady } from '@/services/mastra/ensure-ready';

async function main() {
  getEnv();
  await ensureMastraReady();
  const directory = process.argv[2] ?? getEnv().LETTERS_DIR;
  const summary = await ingestLetterPdfsFromDirectory({ directory, resetPerFile: true });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

void main();
