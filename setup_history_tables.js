const { Client } = require("pg");

async function setup() {
  console.log("Connecting to Postgres...");
  const client = new Client({
    user: "postgres",
    password: "SupabaseSecurePass@2026",
    host: "db.mdbmnbknhkgavqzodoln.supabase.co",
    port: 5432,
    database: "postgres",
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected. Executing SQL...");

  const sql = `
  CREATE TABLE IF NOT EXISTS chats (
    id          UUID PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats (user_id);

  CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'data')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages (chat_id);
  `;

  await client.query(sql);
  console.log("Tables created successfully!");
  await client.end();
}

setup().catch(console.error);
