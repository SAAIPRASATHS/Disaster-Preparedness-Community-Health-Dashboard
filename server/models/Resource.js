const db = require('../db');

const Resource = {
  async create({ name, type, lat, lng, address, contact, food_available = true }) {
    const { rows } = await db.query(
      `INSERT INTO resources (name, type, lat, lng, address, contact, food_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, type, lat, lng, address || null, contact || null, food_available]
    );
    return Resource.format(rows[0]);
  },

  async findAll() {
    const { rows } = await db.query('SELECT * FROM resources ORDER BY created_at DESC');
    return rows.map(Resource.format);
  },

  async findNearby(lat, lon, radiusMetres = 5000) {
    // Haversine approximation in SQL (no PostGIS needed)
    const { rows } = await db.query(
      `SELECT * FROM (
        SELECT *, 
          (6371000 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(lat)) *
            cos(radians(lng) - radians($2)) +
            sin(radians($1)) * sin(radians(lat)))
          )) AS distance
         FROM resources
       ) sub
       WHERE distance <= $3
       ORDER BY distance`,
      [lat, lon, radiusMetres]
    );
    return rows.map(Resource.format);
  },

  async updateFood(id, foodAvailable) {
    const { rows } = await db.query(
      `UPDATE resources SET food_available = $1, last_updated = NOW() WHERE id = $2 RETURNING *`,
      [foodAvailable, id]
    );
    return rows[0] ? Resource.format(rows[0]) : null;
  },

  format(row) {
    if (!row) return null;
    return {
      _id: row.id,
      name: row.name,
      type: row.type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(row.lng), parseFloat(row.lat)],
      },
      address: row.address,
      contact: row.contact,
      status: {
        foodAvailable: row.food_available,
        lastUpdated: row.last_updated,
      },
      createdAt: row.created_at,
    };
  },
};

module.exports = Resource;
