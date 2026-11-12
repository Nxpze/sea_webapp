require('dotenv').config();
const { Client } = require('pg');

async function runMigration() {
  console.log('Running migration for sessions and audit_logs...');
  
  let connStr = process.env.DB_URL;
  connStr = connStr.replace(/[?&]sslmode=[^&]+/g, '');

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        f_id CHARACTER(10) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        user_agent VARCHAR(512),
        ip_address VARCHAR(45)
      );
    `);
    console.log('Table "sessions" created or already exists.');

    // Index on sessions(expires_at) for efficient cleanup/expiry check
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_f_id ON sessions(f_id);
    `);

    // 2. audit_logs table (Approved by user specification in AI Build Guide Sec. 16)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id BIGSERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        actor_f_id CHARACTER(10) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table "audit_logs" created or already exists.');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    `);

    await client.end();
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
