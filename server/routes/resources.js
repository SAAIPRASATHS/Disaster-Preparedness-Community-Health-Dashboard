const router = require('express').Router();
const Resource = require('../models/Resource');

// ── GET Nearby Resources ──
router.get('/', async (req, res) => {
    try {
        const { lat, lon, radius = 5000 } = req.query; // Default radius 5km

        let resources;
        if (lat && lon) {
            resources = await Resource.findNearby(parseFloat(lat), parseFloat(lon), parseInt(radius));
        } else {
            resources = await Resource.findAll();
        }

        res.json(resources);
    } catch (err) {
        console.error('Fetch Resources Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch nearby resources' });
    }
});

// ── PATCH Resource (Admin Only) ──
router.patch('/:id', async (req, res) => {
    try {
        const { foodAvailable } = req.body;
        const resource = await Resource.updateFood(req.params.id, foodAvailable);

        if (!resource) return res.status(404).json({ error: 'Resource not found' });

        // Emit update via socket if possible
        if (req.app.get('io')) {
            req.app.get('io').emit('resource-update', resource);
        }

        res.json(resource);
    } catch (err) {
        console.error('Update Resource Error:', err.message);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});

// ── POST Add Resource (For Seeding/Admin) ──
router.post('/', async (req, res) => {
    try {
        const { name, type, location, address, contact } = req.body;
        const lat = location?.coordinates?.[1] || req.body.lat;
        const lng = location?.coordinates?.[0] || req.body.lng;

        const resource = await Resource.create({ name, type, lat, lng, address, contact });
        res.status(201).json(resource);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
