const db = require('../db');

const SymptomReport = {
  async create({ location, symptoms, userId, userName = 'Citizen' }) {
    const { rows } = await db.query(
      `INSERT INTO symptom_reports (user_id, user_name, location, symptoms)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, userName, location.trim().toLowerCase(), symptoms]
    );
    return SymptomReport.format(rows[0]);
  },

  async findAll(limit = 50) {
    const { rows } = await db.query('SELECT * FROM symptom_reports ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows.map(SymptomReport.format);
  },

  async countSince(since) {
    const { rows } = await db.query('SELECT COUNT(*) as count FROM symptom_reports WHERE created_at >= $1', [since]);
    return parseInt(rows[0].count, 10);
  },

  /**
   * Aggregate symptoms by location (replaces the Mongoose aggregation pipeline).
   * Returns: [{ location, symptoms: [{symptom, count}], totalReports }]
   */
  async aggregateByLocation(since) {
    const { rows } = await db.query(
      `SELECT location, symptom, COUNT(*) as count
       FROM symptom_reports, LATERAL unnest(symptoms) AS symptom
       WHERE created_at >= $1
       GROUP BY location, symptom
       ORDER BY count DESC`,
      [since]
    );

    // Group by location
    const map = {};
    for (const r of rows) {
      if (!map[r.location]) map[r.location] = { symptoms: [], totalReports: 0 };
      const c = parseInt(r.count, 10);
      map[r.location].symptoms.push({ symptom: r.symptom, count: c });
      map[r.location].totalReports += c;
    }

    return Object.entries(map)
      .map(([loc, data]) => ({ _id: loc, ...data }))
      .sort((a, b) => b.totalReports - a.totalReports);
  },

  format(row) {
    if (!row) return null;
    return {
      _id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      location: row.location,
      symptoms: row.symptoms,
      createdAt: row.created_at,
    };
  },
};

module.exports = SymptomReport;
