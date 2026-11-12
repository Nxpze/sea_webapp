const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    let connStr = process.env.DB_URL;
    if (!connStr) {
      throw new Error('DB_URL environment variable is missing');
    }
    // Remove conflicting sslmode query if present so ssl options below take effect
    connStr = connStr.replace(/[?&]sslmode=[^&]+/g, '');
    
    pool = new Pool({
      connectionString: connStr,
      ssl: {
        rejectUnauthorized: false
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.error('Unexpected idle client error in DB pool:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

async function getClient() {
  const p = getPool();
  return p.connect();
}

module.exports = {
  query,
  getClient,
  getPool
};
