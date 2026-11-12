require('dotenv').config();
const { Client } = require('pg');

async function runNotificationsMigration() {
  console.log('Running migration for notifications...');
  
  let connStr = process.env.DB_URL;
  connStr = connStr.replace(/[?&]sslmode=[^&]+/g, '');

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id BIGSERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        actor_f_id CHARACTER(10),
        target_f_id CHARACTER(10),
        action_link VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        notification_id BIGINT NOT NULL,
        f_id CHARACTER(10) NOT NULL,
        read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (notification_id, f_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);

    await client.end();
    console.log('Notifications tables created successfully!');
  } catch (err) {
    console.error('Notifications migration failed:', err.message);
    process.exit(1);
  }
}

runNotificationsMigration();
