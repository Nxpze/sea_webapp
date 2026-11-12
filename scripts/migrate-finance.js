require('dotenv').config();
const { Client } = require('pg');

async function runFinanceMigration() {
  console.log('Running safe ALTER TABLE for financial metadata columns...');
  
  let connStr = process.env.DB_URL;
  connStr = connStr.replace(/[?&]sslmode=[^&]+/g, '');

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. central_fund metadata
    await client.query(`
      ALTER TABLE central_fund 
        ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS void_reason TEXT,
        ADD COLUMN IF NOT EXISTS void_by CHARACTER(10),
        ADD COLUMN IF NOT EXISTS void_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('central_fund columns updated.');

    // 2. expenses metadata & description
    await client.query(`
      ALTER TABLE expenses 
        ADD COLUMN IF NOT EXISTS description VARCHAR(255),
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS void_reason TEXT,
        ADD COLUMN IF NOT EXISTS void_by CHARACTER(10),
        ADD COLUMN IF NOT EXISTS void_at TIMESTAMPTZ;
    `);
    console.log('expenses columns updated.');

    // 3. expenses_split metadata
    await client.query(`
      ALTER TABLE expenses_split 
        ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS void_reason TEXT,
        ADD COLUMN IF NOT EXISTS void_by CHARACTER(10),
        ADD COLUMN IF NOT EXISTS void_at TIMESTAMPTZ;
    `);
    console.log('expenses_split columns updated.');

    // 4. settlement metadata
    await client.query(`
      ALTER TABLE settlement 
        ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS void_reason TEXT,
        ADD COLUMN IF NOT EXISTS void_by CHARACTER(10),
        ADD COLUMN IF NOT EXISTS void_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('settlement columns updated.');

    await client.end();
    console.log('Financial metadata columns migration completed successfully!');
  } catch (err) {
    console.error('Finance migration failed:', err.message);
    process.exit(1);
  }
}

runFinanceMigration();
