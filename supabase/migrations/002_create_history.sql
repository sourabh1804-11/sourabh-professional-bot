-- ============================================================================
-- AskSourabh — Database Migration 002
-- Creates the chats and messages tables for chat history.
-- ============================================================================

-- ── Chats Table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chats (
  id          UUID PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying a user's chats quickly
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats (user_id);


-- ── Messages Table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'data')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching messages for a specific chat
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages (chat_id);
