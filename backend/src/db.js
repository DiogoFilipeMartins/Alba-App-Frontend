const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://admin:admin123@localhost:5432/mydatabase';

const pool = new Pool({ connectionString });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
