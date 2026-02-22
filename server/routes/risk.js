const express = require('express');
const { assessRisk } = require('../engines/riskEngine');

const router = express.Router();

// GET /api/risk?city=Mumbai
router.get('/', async (req, res) => {
    try {
        const { city, lat, lon } = req.query;
        if (!city && (!lat || !lon)) {
            return res.status(400).json({ error: 'city or lat/lon coordinates are required' });
        }

        const assessment = await assessRisk(city, lat, lon);
        res.json(assessment);
    } catch (err) {
        if (err.response && err.response.status === 404) {
            return res.status(404).json({ error: `City "${req.query.city}" not found` });
        }
        console.error('Risk assessment error:', err.message);
        res.status(500).json({ error: 'Failed to assess risk' });
    }
});

module.exports = router;
