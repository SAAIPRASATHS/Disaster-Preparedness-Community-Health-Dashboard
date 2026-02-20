const router = require('express').Router();
const Resource = require('../models/Resource');

// ── GET Nearby Resources ──
router.get('/', async (req, res) => {
    try {
        const { lat, lon, radius = 5000 } = req.query; // Default radius 5km

        let query = {};
        if (lat && lon) {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lon), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            };
        }

        const resources = await Resource.find(query);
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
        const resource = await Resource.findByIdAndUpdate(
            req.params.id,
            {
                'status.foodAvailable': foodAvailable,
                'status.lastUpdated': Date.now()
            },
            { new: true }
        );

        if (!resource) return res.status(404).json({ error: 'Resource not found' });

        // Emit update via socket if possible (patterned from other routes)
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
        const resource = new Resource(req.body);
        await resource.save();
        res.status(201).json(resource);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
