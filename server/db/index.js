/**
 * db/index.js  — PostgreSQL connection (Neon Serverless)
 */
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

/**
 * Run a parameterised query. Returns { rows: [...] } to match pg-style interface.
 */
async function query(text, params = []) {
  const rows = await sql.query(text, params);
  return { rows };
}

/**
 * Run the schema.sql to create tables if they don't exist.
 */
async function initDb() {
  const fs = require('fs');
  const path = require('path');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  // Split on semicolons that are followed by whitespace/newline (end of statement)
  const statements = schemaSql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  try {
    for (const stmt of statements) {
      await sql.query(stmt);
    }
    console.log('✅ Database schema initialised');
  } catch (err) {
    console.error('❌ Schema init error:', err.message);
    throw err;
  }
}

module.exports = {
  query,
  sql,
  initDb,
};
