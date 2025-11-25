const { Pool } = require('pg');
require('dotenv').config();

// Support Railway's DATABASE_URL format: postgresql://user:password@host:port/database
let poolConfig;
if (process.env.DATABASE_URL) {
  // Railway provides DATABASE_URL in the format: postgresql://user:password@host:port/database
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
} else {
  // Fallback to individual environment variables
  poolConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'jobsearch',
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('PostgreSQL connected successfully');
  }
});

module.exports = pool;

