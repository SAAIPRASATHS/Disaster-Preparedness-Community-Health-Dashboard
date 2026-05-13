const db = require('../db');

const Complaint = {
  async create({ userId, userName = 'Anonymous', location, description }) {
    const { rows } = await db.query(
      `INSERT INTO complaints (user_id, user_name, location, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, userName, location, description]
    );
    return Complaint.format(rows[0]);
  },

  async findAll(limit = 50) {
    const { rows } = await db.query('SELECT * FROM complaints ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows.map(Complaint.format);
  },

  async updateStatus(id, status) {
    const { rows } = await db.query(
      'UPDATE complaints SET status = $1 WHERE id = $2 RETURNING *', [status, id]
    );
    return rows[0] ? Complaint.format(rows[0]) : null;
  },

  format(row) {
    if (!row) return null;
    return {
      _id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      location: row.location,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
    };
  },
};

module.exports = Complaint;
