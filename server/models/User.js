const db = require('../db');
const bcrypt = require('bcryptjs');

const User = {
  async create({ name, email, password, role = 'user', familyMembers = 1, elderly = 0, children = 0, conditions = [] }) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password, role, family_members, elderly, children, conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, email.toLowerCase().trim(), hashed, role, familyMembers, elderly, children, conditions]
    );
    return User.sanitize(rows[0]);
  },

  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async comparePassword(plainText, hashed) {
    return bcrypt.compare(plainText, hashed);
  },

  /** Strip password from user object before returning to client */
  sanitize(user) {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },
};

module.exports = User;
