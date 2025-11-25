const { Pool } = require('pg');
require('dotenv').config();

// Support Railway's DATABASE_URL format: postgresql://user:password@host:port/database
function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    // Railway provides DATABASE_URL in the format: postgresql://user:password@host:port/database
    const url = process.env.DATABASE_URL;
    console.log('Using DATABASE_URL for connection');
    return {
      connectionString: url,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  } else {
    // Fallback to individual environment variables
    console.log('Using individual environment variables for database connection');
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'jobsearch',
    };
  }
}

const poolConfig = getPoolConfig();
const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in production, let the app handle it
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Test connection (non-blocking, won't fail module load)
setTimeout(() => {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error connecting to PostgreSQL:', err.message);
    } else {
      console.log('PostgreSQL connected successfully');
    }
  });
}, 1000);

module.exports = pool;

