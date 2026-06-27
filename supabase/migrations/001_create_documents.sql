-- ============================================================================
-- AskSourabh — Database Migration 001
-- Creates the documents table for RAG vector storage and the chat_logs table
-- for monitoring and evaluation.
-- ============================================================================

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Documents Table (Layer 4: RAG Pipeline) ──────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id          BIGSERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  category    TEXT NOT NULL,       -- 'resume', 'portfolio', 'blog', 'linkedin', 'github'
  source      TEXT,                -- original file or URL
  metadata    JSONB DEFAULT '{}',  -- flexible: { title, section, date, parent_chunk_id }
  embedding   VECTOR(768),         -- Gemini text-embedding-004 dimension
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index (preferred over IVFFlat for <100K vectors — faster, no training step)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);

-- Category index for filtered searches
CREATE INDEX IF NOT EXISTS documents_category_idx
  ON documents (category);

-- ── Match Documents RPC Function ─────────────────────────────────────────
-- Supports multi-category filtering + similarity threshold

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 8,
  filter_categories TEXT[] DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.3
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  category TEXT,
  source TEXT,
  metadata JSONB,
  similarity FLOAT
)
AS $$
  SELECT
    documents.id,
    documents.content,
    documents.category,
    documents.source,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE (filter_categories IS NULL OR documents.category = ANY(filter_categories))
    AND 1 - (documents.embedding <=> query_embedding) > similarity_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;

-- ── Chat Logs Table (Layer 6: Evaluation & Monitoring) ───────────────────

CREATE TABLE IF NOT EXISTS chat_logs (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT NOT NULL,
  user_ip         TEXT,
  query           TEXT NOT NULL,
  response        TEXT,
  chunks_used     JSONB,                     -- [{ id, similarity }]
  scope_category  TEXT[],                    -- categories selected by Layer 3
  latency_ms      INT,
  input_tokens    INT,
  output_tokens   INT,
  hit_fallback    BOOLEAN DEFAULT FALSE,     -- did the bot say "I don't know"?
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs by session
CREATE INDEX IF NOT EXISTS chat_logs_session_idx
  ON chat_logs (session_id);
