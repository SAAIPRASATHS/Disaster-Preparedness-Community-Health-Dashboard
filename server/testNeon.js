const db = require('./db');

async function testConnection() {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('✅ Success! Current time from Neon:', res.rows[0].now);

    // Also test schema init
    await db.initDb();
    console.log('✅ Schema initialised successfully');

    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
