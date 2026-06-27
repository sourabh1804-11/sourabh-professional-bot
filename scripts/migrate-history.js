const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres:v%23e.%40pP%2BNuEMBW9@db.mdbmnbknhkgavqzodoln.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    
    console.log('Reading migration file 002_create_chat_history.sql...');
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_create_chat_history.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing migration (this may take a moment)...');
    await client.query(sql);
    
    console.log('✅ Migration executed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
