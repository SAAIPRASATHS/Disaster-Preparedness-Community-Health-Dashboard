const router = require('express').Router();
const Complaint = require('../models/Complaint');

// POST /api/complaint — submit complaint
router.post('/', async (req, res) => {
    try {
        const { location, description } = req.body;
        if (!location || !description) {
            return res.status(400).json({ error: 'Location and description are required' });
        }

        const complaint = await Complaint.create({
            userId: req.user.id,
            userName: req.user.name || 'Citizen',
            location,
            description,
        });

        // WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('new-complaint', {
                id: complaint._id,
                userName: complaint.userName,
                location: complaint.location,
                description: complaint.description,
                status: complaint.status,
                createdAt: complaint.createdAt,
            });
        }

        res.status(201).json({ success: true, complaint });
    } catch (err) {
        console.error('Complaint error:', err.message);
        res.status(500).json({ error: 'Failed to submit complaint' });
    }
});

// GET /api/complaint — list complaints (admin)
router.get('/', async (req, res) => {
    try {
        const complaints = await Complaint.find().sort({ createdAt: -1 }).limit(50);
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// PATCH /api/complaint/:id/status — update status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'in-progress', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

        const io = req.app.get('io');
        if (io) io.emit('complaint-updated', { id: complaint._id, status });

        res.json(complaint);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

// PUT /api/complaint/:id/resolve — shortcut to resolve a complaint
router.put('/:id/resolve', async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { status: 'resolved' },
            { new: true }
        );
        if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

        const io = req.app.get('io');
        if (io) io.emit('complaint-resolved', {
            id: complaint._id,
            status: 'resolved',
            complaint,
        });

        res.json(complaint);
    } catch (err) {
        console.error('Resolve complaint error:', err.message);
        res.status(500).json({ error: 'Failed to resolve complaint' });
    }
});

module.exports = router;
