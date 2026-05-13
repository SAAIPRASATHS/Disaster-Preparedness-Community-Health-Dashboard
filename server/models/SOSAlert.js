const db = require('../db');

const SOSAlert = {
  async create({ userId, userName = 'Anonymous', location, message = 'Emergency SOS' }) {
    const { rows } = await db.query(
      `INSERT INTO sos_alerts (user_id, user_name, lat, lng, address, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, userName, location.lat, location.lng, location.address || '', message]
    );
    return SOSAlert.format(rows[0]);
  },

  async findAll(limit = 50) {
    const { rows } = await db.query('SELECT * FROM sos_alerts ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows.map(SOSAlert.format);
  },

  async resolve(id) {
    const { rows } = await db.query(
      'UPDATE sos_alerts SET resolved = TRUE WHERE id = $1 RETURNING *', [id]
    );
    return rows[0] ? SOSAlert.format(rows[0]) : null;
  },

  async countRecentByAddress(address, hoursAgo = 1) {
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const { rows } = await db.query(
      `SELECT COUNT(*) as count FROM sos_alerts
       WHERE address = $1 AND created_at >= $2 AND resolved = FALSE`, [address, since]
    );
    return parseInt(rows[0].count, 10);
  },

  /** Normalise column names to match old API shape */
  format(row) {
    if (!row) return null;
    return {
      _id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      location: { lat: parseFloat(row.lat), lng: parseFloat(row.lng), address: row.address },
      message: row.message,
      resolved: row.resolved,
      timestamp: row.created_at,
    };
  },
};

module.exports = SOSAlert;
