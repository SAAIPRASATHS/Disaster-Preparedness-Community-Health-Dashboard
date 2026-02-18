const router = require('express').Router();
const LiveAlert = require('../models/LiveAlert');

// POST /api/live-alert — create alert
router.post('/', async (req, res) => {
    try {
        const { type, message, severity, area } = req.body;
        if (!type || !message || !area) {
            return res.status(400).json({ error: 'type, message, and area are required' });
        }

        const alert = await LiveAlert.create({ type, message, severity, area });

        const io = req.app.get('io');
        if (io) io.emit('live-alert', alert);

        res.status(201).json(alert);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// GET /api/live-alert — fetch recent alerts
router.get('/', async (req, res) => {
    try {
        const alerts = await LiveAlert.find().sort({ createdAt: -1 }).limit(50);
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

module.exports = router;
