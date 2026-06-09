const db = require('../db');

const SymptomReport = {
  async create({ location, symptoms, userId, userName = 'Citizen', ageGroup = 'adult', severity = 'mild', duration = 'less_than_1_day', aiCondition, aiRiskLevel, aiRecommendation }) {
    const { rows } = await db.query(
      `INSERT INTO symptom_reports (user_id, user_name, location, symptoms, age_group, severity, duration, status, ai_condition, ai_risk_level, ai_recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_analysis', $8, $9, $10) RETURNING *`,
      [userId, userName, location.trim().toLowerCase(), symptoms, ageGroup, severity, duration, aiCondition || null, aiRiskLevel || null, aiRecommendation || null]
    );
    return SymptomReport.format(rows[0]);
  },

  async findAll(limit = 100) {
    const { rows } = await db.query('SELECT * FROM symptom_reports ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows.map(SymptomReport.format);
  },

  async countSince(since) {
    const { rows } = await db.query('SELECT COUNT(*) as count FROM symptom_reports WHERE created_at >= $1', [since]);
    return parseInt(rows[0].count, 10);
  },

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [today, weekly, monthly, topSymptoms, severityDist] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM symptom_reports WHERE created_at >= $1', [todayStart]),
      db.query('SELECT COUNT(*) as count FROM symptom_reports WHERE created_at >= $1', [weekStart]),
      db.query('SELECT COUNT(*) as count FROM symptom_reports WHERE created_at >= $1', [monthStart]),
      db.query(`SELECT symptom, COUNT(*) as count FROM symptom_reports, LATERAL unnest(symptoms) AS symptom WHERE created_at >= $1 GROUP BY symptom ORDER BY count DESC LIMIT 10`, [weekStart]),
      db.query(`SELECT severity, COUNT(*) as count FROM symptom_reports GROUP BY severity ORDER BY count DESC`),
    ]);

    return {
      today: parseInt(today.rows[0].count, 10),
      weekly: parseInt(weekly.rows[0].count, 10),
      monthly: parseInt(monthly.rows[0].count, 10),
      topSymptoms: topSymptoms.rows.map(r => ({ symptom: r.symptom, count: parseInt(r.count, 10) })),
      severityDistribution: severityDist.rows.map(r => ({ severity: r.severity, count: parseInt(r.count, 10) })),
    };
  },

  async updateStatus(id, status) {
    const { rows } = await db.query(
      `UPDATE symptom_reports SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return SymptomReport.format(rows[0]);
  },

  /**
   * Aggregate symptoms by location
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
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      location: row.location,
      symptoms: row.symptoms,
      ageGroup: row.age_group,
      severity: row.severity,
      duration: row.duration,
      status: row.status,
      aiCondition: row.ai_condition,
      aiRiskLevel: row.ai_risk_level,
      aiRecommendation: row.ai_recommendation,
      createdAt: row.created_at,
    };
  },
};

module.exports = SymptomReport;
