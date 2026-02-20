const express = require('express');
const SymptomReport = require('../models/SymptomReport');

const router = express.Router();

// POST /api/report
router.post('/', async (req, res) => {
    try {
        const { location, symptoms } = req.body;

        if (!location || !symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({ error: 'location and symptoms[] are required' });
        }

        const report = await SymptomReport.create({
            location: location.trim().toLowerCase(),
            symptoms,
            userId: req.user.id,
            userName: req.user.name || 'Citizen',
        });

        // WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('new-report', {
                id: report._id,
                location: report.location,
                symptoms: report.symptoms,
                userName: report.userName,
                createdAt: report.createdAt
            });
        }

        res.status(201).json({
            message: 'Symptom report submitted successfully',
            report,
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        console.error('Report submission error:', err.message);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// GET /api/report — list reports (admin)
router.get('/', async (req, res) => {
    try {
        const reports = await SymptomReport.find().sort({ createdAt: -1 }).limit(50);
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

module.exports = router;
