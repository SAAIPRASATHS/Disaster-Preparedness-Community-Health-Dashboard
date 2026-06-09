const db = require('../db');

const DisasterAlert = {
  async create({ title, description, title_ta, title_hi, description_ta, description_hi, source, disasterType, severity = 'MEDIUM', district, state = 'Tamil Nadu', latitude, longitude, issuedAt, externalId, isAi = false, referenceLink }) {
    if (externalId) {
      const { rows: existing } = await db.query('SELECT id FROM disaster_alerts WHERE external_id = $1', [externalId]);
      if (existing.length > 0) return null;
    }

    const { rows } = await db.query(
      `INSERT INTO disaster_alerts (title, description, title_ta, title_hi, description_ta, description_hi, source, disaster_type, severity, district, state, latitude, longitude, issued_at, external_id, is_ai, reference_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (external_id) DO NOTHING
       RETURNING *`,
      [title, description, title_ta, title_hi, description_ta, description_hi, source, disasterType, severity, district, state, latitude || null, longitude || null, issuedAt || new Date(), externalId || null, isAi, referenceLink || null]
    );
    return rows[0] ? DisasterAlert.format(rows[0]) : null;
  },

  async findAll({ limit = 100, type, severity, district, status, isAi } = {}) {
    let query = 'SELECT * FROM disaster_alerts WHERE 1=1';
    const params = [];
    if (type) { params.push(type); query += ` AND disaster_type = $${params.length}`; }
    if (severity) { params.push(severity); query += ` AND severity = $${params.length}`; }
    if (district) { params.push(`%${district}%`); query += ` AND district ILIKE $${params.length}`; }
    if (status) { params.push(status); query += ` AND alert_status = $${params.length}`; }
    if (isAi !== undefined) { params.push(isAi); query += ` AND is_ai = $${params.length}`; }
    params.push(limit);
    query += ` ORDER BY issued_at DESC LIMIT $${params.length}`;
    const { rows } = await db.query(query, params);
    return rows.map(DisasterAlert.format);
  },

  async resolve(id) {
    const { rows } = await db.query(
      `UPDATE disaster_alerts SET alert_status='RESOLVED', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id]
    );
    return rows[0] ? DisasterAlert.format(rows[0]) : null;
  },

  async getStats() {
    const [active, bySeverity, byType, byDistrict] = await Promise.all([
      db.query(`SELECT COUNT(*) as count FROM disaster_alerts WHERE alert_status='ACTIVE' AND is_ai=false`),
      db.query(`SELECT severity, COUNT(*) as count FROM disaster_alerts WHERE alert_status='ACTIVE' AND is_ai=false GROUP BY severity`),
      db.query(`SELECT disaster_type, COUNT(*) as count FROM disaster_alerts WHERE alert_status='ACTIVE' AND is_ai=false GROUP BY disaster_type ORDER BY count DESC LIMIT 10`),
      db.query(`SELECT district, COUNT(*) as count FROM disaster_alerts WHERE alert_status='ACTIVE' AND is_ai=false GROUP BY district ORDER BY count DESC LIMIT 10`),
    ]);
    return {
      activeCount: parseInt(active.rows[0].count, 10),
      bySeverity: bySeverity.rows,
      byType: byType.rows,
      byDistrict: byDistrict.rows,
    };
  },

  format(row) {
    if (!row) return null;
    return {
      _id: row.id,
      id: row.id,
      title: row.title,
      description: row.description,
      title_ta: row.title_ta,
      title_hi: row.title_hi,
      description_ta: row.description_ta,
      description_hi: row.description_hi,
      source: row.source,
      disasterType: row.disaster_type,
      severity: row.severity,
      district: row.district,
      state: row.state,
      latitude: row.latitude,
      longitude: row.longitude,
      issuedAt: row.issued_at,
      updatedAt: row.updated_at,
      alertStatus: row.alert_status,
      isAi: row.is_ai,
      referenceLink: row.reference_link
    };
  },
};

module.exports = DisasterAlert;
