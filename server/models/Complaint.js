const db = require('../db');

const Complaint = {
  async create({ userId, userName = 'Anonymous', location, description, imageUrl = null }) {
    const { rows } = await db.query(
      `INSERT INTO complaints (user_id, user_name, location, description, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, userName, location, description, imageUrl]
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
      imageUrl: row.image_url || null,
      status: row.status,
      createdAt: row.created_at,
    };
  },
};

module.exports = Complaint;
