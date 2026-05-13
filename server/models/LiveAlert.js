const db = require('../db');

const LiveAlert = {
  async create({ type, message, severity = 'MEDIUM', area, source = 'system' }) {
    const { rows } = await db.query(
      `INSERT INTO live_alerts (type, message, severity, area, source)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, message, severity, area, source]
    );
    return LiveAlert.format(rows[0]);
  },

  async findAll(limit = 50) {
    const { rows } = await db.query('SELECT * FROM live_alerts ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows.map(LiveAlert.format);
  },

  format(row) {
    if (!row) return null;
    return {
      _id: row.id,
      type: row.type,
      message: row.message,
      severity: row.severity,
      area: row.area,
      source: row.source,
      createdAt: row.created_at,
    };
  },
};

module.exports = LiveAlert;
