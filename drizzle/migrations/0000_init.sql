CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"year" integer,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_documents_filename_unique" UNIQUE("filename")
);
