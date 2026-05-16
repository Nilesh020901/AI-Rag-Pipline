# Berkshire Hathaway Intelligence (Mastra RAG)

Production-oriented RAG app: **Next.js (App Router) + TypeScript + Mastra + Neon PostgreSQL (pgvector)**. It answers questions using Berkshire Hathaway shareholder letters as the knowledge base, with **streaming** responses and **persistent conversation memory**.

The original coursework brief is in [docs/ASSIGNMENT.md](docs/ASSIGNMENT.md). Primary framework docs: [Mastra documentation](https://mastra.ai/docs).

---

## Architecture (concise)

| Layer | Responsibility |
|-------|----------------|
| **UI** | `src/app/page.tsx`, `src/components/BerkshireChat.tsx`, styles in `src/styles/chat.css` (Tailwind + plain CSS; no CSS modules). |
| **API** | `src/app/api/chat` — streams model text; `src/app/api/ingest` — runs ingestion; `src/app/api/health` — index stats. Thin routes delegate to services. |
| **Mastra** | `src/mastra/index.ts` registers agent, workflow, `PostgresStore`, and `PgVector`. |
| **Agent** | `berkshireAgent` — `openai/gpt-4o`, `createVectorQueryTool` over pgvector, `Memory` (Postgres + same pgvector + semantic recall). |
| **RAG** | PDF → `PDFParse` (text) → `MDocument.fromText` → `chunk` (recursive) → `embedMany` (`openai/text-embedding-3-small`, 1536d) → `PgVector.upsert` with metadata (`text`, `year`, `sourceFile`, `chunkIndex`). |
| **DB** | Drizzle schema `source_documents` + SQL migrations; Mastra creates its own tables on `PostgresStore.init()`. |

**Folder structure**

```text
src/
  app/                 # Next.js routes + layout
  components/          # React UI
  styles/              # Plain CSS (imported into components)
  lib/config/          # Env + RAG constants
  lib/db/              # Drizzle client + schema
  lib/errors/          # API error helpers
  mastra/              # Mastra instance, agent, workflow, postgres singletons
  services/ingestion/  # PDF → chunks → embeddings → vector store
  services/mastra/     # storage init helper
scripts/ingest.ts      # CLI ingestion (same pipeline as API)
data/letters/          # Put PDFs here (see assignment Google Drive link)
drizzle/migrations/    # Postgres DDL (pgvector + app tables)
```

---

## Prerequisites

- Node.js 20+ (see Next.js / ESLint engine warnings for your exact version).
- **Neon** project with **pgvector** enabled (Neon supports the extension; migration also runs `CREATE EXTENSION IF NOT EXISTS vector`).
- **OpenAI** API key (`gpt-4o` + `text-embedding-3-small`).

---

## Setup

1. **Clone / open repo** and install deps:

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` and fill in values:

   - `DATABASE_URL` — Neon connection string (`?sslmode=require` recommended).
   - `GOOGLE_GENERATIVE_AI_API_KEY`.
   - Optional: `INGEST_SECRET` (required header for `POST /api/ingest` if set).
   - Optional: `LETTERS_DIR` (defaults to `data/letters`).

3. **Download letters** from the Google Drive folder linked in [docs/ASSIGNMENT.md](docs/ASSIGNMENT.md) and place all PDFs under `data/letters/`.

4. **Apply migrations** (creates `source_documents` + enables pgvector):

   ```bash
   npx drizzle-kit migrate
   ```

5. **Ingest embeddings** (pick one):

   ```bash
   npm run ingest
   # or with a custom folder:
   npm run ingest -- path/to/pdfs
   ```

   Or after `npm run dev`:

   ```http
   POST /api/ingest
   Content-Type: application/json
   # Optional header if INGEST_SECRET is set:
   # x-ingest-secret: <your-secret>

   { "directory": "data/letters", "resetSource": true }
   ```

6. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The UI streams the assistant reply as plain text.

---

## API overview

| Method / path | Purpose |
|---------------|---------|
| `POST /api/chat` | Body: `{ messages: UIMessage[], threadId?, resourceId? }`. Returns `text/plain` stream. Response header `X-Thread-Id` identifies the Mastra memory thread (client stores it for follow-ups). |
| `POST /api/ingest` | Runs the same pipeline as `npm run ingest`. |
| `GET /api/health` | JSON: index name, chunk count (if index exists), errors if DB unreachable. |

---

## Mastra development playground (optional)

The assignment references Mastra Studio / `mastra dev`. This repo uses **direct Mastra integration** inside Next.js (`import { mastra } from '@/mastra'`). You can still run the Mastra CLI against `src/mastra` if you add a `mastra.config.ts` per [local dev docs](https://mastra.ai/docs/local-dev/mastra-dev); the chat UI does not depend on it.

---

## Tech choices (mapping to Mastra docs)

- **RAG pipeline** — [RAG overview](https://mastra.ai/docs/rag/overview), `MDocument`, `embedMany` + `ModelRouterEmbeddingModel`, `PgVector`.
- **Tools** — `createVectorQueryTool` ([reference](https://mastra.ai/reference/tools/vector-query-tool)).
- **Memory** — `@mastra/memory` with `PostgresStore`, `PgVector`, and `semanticRecall` ([memory / PostgreSQL patterns](https://mastra.ai/examples/memory/memory-with-pg)).
- **Next.js** — [Integrate Mastra in Next.js](https://mastra.ai/docs/frameworks/next-js): `serverExternalPackages` for `@mastra/*`, `pdf-parse`, `pg`.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | Production build / run |
| `npm run db:generate` | Drizzle: generate migrations from schema |
| `npm run db:migrate` | Drizzle: apply migrations |
| `npm run ingest` | Ingest PDFs from `LETTERS_DIR` or CLI path |

---

## License / data

Letter PDFs are third-party content; use only per the course / Drive terms. This repository is sample coursework code.
know is in the official Mastra documentation!
This assignment will test your ability to learn from documentation, follow 
framework patterns, and implement complex AI functionality using a modern 
development framework. Focus on understanding Mastra's concepts deeply and 
implementing them correctly