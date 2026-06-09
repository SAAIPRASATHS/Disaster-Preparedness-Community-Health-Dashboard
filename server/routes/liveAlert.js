const router = require('express').Router();
const DisasterAlert = require('../models/DisasterAlert');

// POST /api/live-alert — create alert manually
router.post('/', async (req, res) => {
    try {
        const { title, description, disasterType, severity, district, latitude, longitude, source } = req.body;
        if (!title || !description || !disasterType) {
            return res.status(400).json({ error: 'title, description, and disasterType are required' });
        }

        const alert = await DisasterAlert.create({
            title, description, disasterType, severity, district, latitude, longitude, source: source || 'Admin'
        });

        const io = req.app.get('io');
        if (io && alert) io.emit('disaster-alert', alert);

        res.status(201).json(alert);
    } catch (err) {
        console.error('Alert creation error:', err);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// GET /api/live-alert — fetch recent alerts (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { limit, type, severity, district, status } = req.query;
        const alerts = await DisasterAlert.findAll({
            limit: limit ? parseInt(limit) : 100,
            type, severity, district, status
        });
        res.json(alerts);
    } catch (err) {
        console.error('Alert fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// GET /api/live-alert/stats — fetch alert statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await DisasterAlert.getStats();
        res.json(stats);
    } catch (err) {
        console.error('Stats fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// PATCH /api/live-alert/:id/resolve — resolve an alert
router.patch('/:id/resolve', async (req, res) => {
    try {
        const alert = await DisasterAlert.resolve(req.params.id);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        res.json(alert);
    } catch (err) {
        console.error('Alert resolve error:', err);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

module.exports = router;
