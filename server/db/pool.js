const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWD,
  database: process.env.DB,
  port:     parseInt(process.env.DB_PORT) || 5432,
});

// Confirm connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Database connection failed:', err.message);
  } else {
    console.log('✅  Connected to PostgreSQL:', process.env.DB);
    release();
  }
});

module.exports = pool;
