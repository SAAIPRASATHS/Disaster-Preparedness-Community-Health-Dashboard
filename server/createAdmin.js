/**
 * Create admin user in PostgreSQL
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function createAdmin() {
  const email = 'admin@resilience.network';
  const password = 'admin123';
  const name = 'Admin';

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  try {
    // Check if already exists
    const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      // Update to admin role
      await db.query('UPDATE users SET role = $1, password = $2 WHERE email = $3', ['admin', hashed, email]);
      console.log('✅ Updated existing user to admin');
    } else {
      await db.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [name, email, hashed, 'admin']
      );
      console.log('✅ Admin user created');
    }
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
