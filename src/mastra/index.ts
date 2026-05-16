import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { Observability, MastraStorageExporter, SensitiveDataFilter } from '@mastra/observability';
import { berkshireAgent } from './agents/berkshire-agent';
import { berkshireIngestWorkflow } from './workflows/berkshire-ingest-workflow';
import { BERKSHIRE_VECTOR_STORE_NAME } from '@/lib/config/rag';
import { getPgVector, getPostgresStore } from '@/mastra/infrastructure/postgres';

export const mastra = new Mastra({
  agents: { berkshireAgent },
  workflows: { berkshireIngestWorkflow },
  storage: getPostgresStore(),
  vectors: {
    [BERKSHIRE_VECTOR_STORE_NAME]: getPgVector(),
  },
  logger: new PinoLogger({
    name: 'berkshire-rag',
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'berkshire-rag',
        exporters: [new MastraStorageExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
