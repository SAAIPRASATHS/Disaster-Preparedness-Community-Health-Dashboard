const router = require('express').Router();
const SOSAlert = require('../models/SOSAlert');
const LiveAlert = require('../models/LiveAlert');

// POST /api/sos — create SOS alert
router.post('/', async (req, res) => {
    try {
        const { location, message } = req.body;
        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({ error: 'Location (lat/lng) is required' });
        }

        const alert = await SOSAlert.create({
            userId: req.user.id,
            userName: req.user.name || 'Citizen',
            location,
            message: message || 'Emergency SOS',
        });

        // Save a LiveAlert too
        await LiveAlert.create({
            type: 'sos',
            message: `SOS from ${alert.userName} at ${location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}`,
            severity: 'CRITICAL',
            area: location.address || 'Unknown area',
        });

        // SMS simulation
        console.log(`📲 SMS SIMULATION: Emergency SOS from ${alert.userName} at (${location.lat}, ${location.lng}). Dispatching authorities.`);

        // WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('new-sos', {
                id: alert._id,
                userName: alert.userName,
                location: alert.location,
                message: alert.message,
                timestamp: alert.timestamp,
            });
        }

        // Proactive: check for multiple SOS in same area
        const recentSOS = await SOSAlert.countDocuments({
            'location.address': location.address || '',
            timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
            resolved: false,
        });
        if (recentSOS >= 3 && io) {
            io.emit('area-critical', {
                area: location.address || 'Unknown',
                sosCount: recentSOS,
                message: `CRITICAL: ${recentSOS} SOS alerts from ${location.address || 'same area'} in the last hour`,
            });
        }

        res.status(201).json({ success: true, alert });
    } catch (err) {
        console.error('SOS error:', err.message);
        res.status(500).json({ error: 'Failed to create SOS alert' });
    }
});

// GET /api/sos — list SOS alerts (admin)
router.get('/', async (req, res) => {
    try {
        const alerts = await SOSAlert.find().sort({ timestamp: -1 }).limit(50);
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch SOS alerts' });
    }
});

// PATCH /api/sos/:id/resolve — resolve SOS
router.patch('/:id/resolve', async (req, res) => {
    try {
        const alert = await SOSAlert.findByIdAndUpdate(req.params.id, { resolved: true }, { new: true });
        if (!alert) return res.status(404).json({ error: 'SOS alert not found' });

        const io = req.app.get('io');
        if (io) io.emit('sos-resolved', { id: alert._id });

        res.json(alert);
    } catch (err) {
        res.status(500).json({ error: 'Failed to resolve SOS' });
    }
});

module.exports = router;
