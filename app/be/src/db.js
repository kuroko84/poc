const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://poc:poc@localhost:5433/poc',
});

module.exports = { pool };
