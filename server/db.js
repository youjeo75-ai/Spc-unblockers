// db.js — Postgres connection + schema setup
// Render (and most hosts) inject a DATABASE_URL env var automatically
// when you attach a Postgres database to your service.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false } // Render's managed Postgres needs this
});

// Creates tables if they don't exist yet. Safe to run on every boot.
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ,
      last_ip TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bans (
      id SERIAL PRIMARY KEY,
      ip TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      banned_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(ip),
      UNIQUE(user_id)
    );
  `);

  // express-session's connect-pg-simple will create its own "session"
  // table automatically (createTableIfMissing: true in server.js).

  console.log('[db] schema ready');
}

module.exports = { pool, initSchema };
