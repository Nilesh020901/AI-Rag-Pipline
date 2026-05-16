/** Mastra PgVector index for Berkshire Hathaway letter chunks */
export const BERKSHIRE_VECTOR_INDEX = 'berkshire_letters';

/** Registered name on the Mastra instance */
export const BERKSHIRE_VECTOR_STORE_NAME = 'berkshireVectors' as const;

export const EMBEDDING_MODEL = 'google/gemini-embedding-2' as const;

export const EMBEDDING_DIMENSIONS = 3072;

export const CHAT_MODEL = 'google/gemini-2.5-flash' as const;

export const CHUNK_SIZE = 8192;
export const CHUNK_OVERLAP = 500;
