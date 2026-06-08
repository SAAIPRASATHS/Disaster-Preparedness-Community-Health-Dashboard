const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Complaint = require('../models/Complaint');

// ── Multer setup — disk storage under server/uploads/complaints/ ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'complaints');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
               allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// POST /api/complaint — submit complaint (with optional image)
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { location, description } = req.body;
        if (!location || !description) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Location and description are required' });
        }

        const imageUrl = req.file
            ? `/uploads/complaints/${req.file.filename}`
            : null;

        const complaint = await Complaint.create({
            userId: req.user.id,
            userName: req.user.name || 'Citizen',
            location,
            description,
            imageUrl,
        });

        // WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('new-complaint', {
                id: complaint._id,
                userName: complaint.userName,
                location: complaint.location,
                description: complaint.description,
                imageUrl: complaint.imageUrl,
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
        const complaints = await Complaint.findAll(50);
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
        const complaint = await Complaint.updateStatus(req.params.id, status);
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
        const complaint = await Complaint.updateStatus(req.params.id, 'resolved');
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
