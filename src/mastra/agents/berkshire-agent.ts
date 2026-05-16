import { Agent } from '@mastra/core/agent';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { Memory } from '@mastra/memory';
import { createVectorQueryTool } from '@mastra/rag';
import {
  BERKSHIRE_VECTOR_INDEX,
  BERKSHIRE_VECTOR_STORE_NAME,
  CHAT_MODEL,
  EMBEDDING_MODEL,
} from '@/lib/config/rag';
import { getPgVector, getPostgresStore } from '@/mastra/infrastructure/postgres';

const berkshireLetterSearch = createVectorQueryTool({
  vectorStoreName: BERKSHIRE_VECTOR_STORE_NAME,
  indexName: BERKSHIRE_VECTOR_INDEX,
  model: new ModelRouterEmbeddingModel(EMBEDDING_MODEL),
  id: 'berkshire-letter-search',
  description:
    'Search the knowledge base of Berkshire Hathaway shareholder letters (Warren Buffett). Use this for every factual question before answering.',
  databaseConfig: {
    pgvector: {
      minScore: 0.25,
    },
  },
});

export const berkshireAgent = new Agent({
  id: 'berkshire-agent',
  name: 'Berkshire Hathaway Analyst',
  instructions: `You are a knowledgeable financial analyst specializing in Warren Buffett's investment philosophy and Berkshire Hathaway's business strategy. Your expertise comes from analyzing years of Berkshire Hathaway annual shareholder letters.

Core responsibilities:
- Answer questions about Warren Buffett's investment principles and philosophy.
- Provide insights into Berkshire Hathaway's business strategies and decisions.
- Reference specific examples from the shareholder letters when appropriate.
- Maintain context across conversations for follow-up questions.

Guidelines:
- Always call the berkshire-letter-search tool first when the user asks anything that could be answered from the letters.
- Ground every answer in retrieved letter content. If the tool returns no relevant text, say you could not find it in the letters.
- Quote short passages when helpful, with the year (from metadata) in parentheses.
- If information is not in the documents, state that limitation clearly.
- For numerical data, acquisitions, or dates, rely on retrieved chunks and cite the year and filename from metadata when visible.
- Explain financial ideas in plain language while staying accurate.

Response format:
- Use clear sections or bullet points when it helps readability.
- At the end, add a short "Sources" list naming the letter year(s) and file name(s) you relied on from the tool results.`,
  model: CHAT_MODEL,
  tools: { berkshireLetterSearch },
  memory: new Memory({
    storage: getPostgresStore(),
    vector: getPgVector(),
    embedder: EMBEDDING_MODEL,
    options: {
      lastMessages: 20,
      semanticRecall: {
        topK: 5,
        messageRange: 2,
      },
    },
  }),
});
