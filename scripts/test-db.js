require('dotenv').config();
const { Client } = require('pg');

async function testDB() {
  console.log('Testing YugabyteDB connection...');
  
  const connectionString = process.env.DB_URL;
  if (!connectionString) {
    console.error('Error: DB_URL is not defined in environment variables.');
    process.exit(1);
  }

  let connStr = connectionString;
  // If connection string contains sslmode, strip it so custom ssl configuration is respected
  connStr = connStr.replace(/[?&]sslmode=[^&]+/g, '');

  const client = new Client({
    connectionString: connStr,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to YugabyteDB successfully.');

    // Query list of tables in public schema
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Tables in public schema:', res.rows.map(r => r.table_name));

    // Check row counts of existing tables
    for (const r of res.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${r.table_name}"`);
      console.log(`- Table ${r.table_name}: ${countRes.rows[0].count} rows`);
    }

    // Check friends table names (to verify member names without exposing any secrets)
    const friendsRes = await client.query(`SELECT f_id, name FROM friends ORDER BY f_id`);
    console.log('Members in friends table:', friendsRes.rows);

    // Check trip_settings
    const settingsRes = await client.query(`SELECT setting_id, trip_start_date, trip_end_date, updated_at FROM trip_settings`);
    console.log('Trip settings row:', settingsRes.rows);

    await client.end();
    console.log('Database connection test passed!');
  } catch (err) {
    console.error('Database connection test failed:', err.message);
    process.exit(1);
  }
}

testDB();
