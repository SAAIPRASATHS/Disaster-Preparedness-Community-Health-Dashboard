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
        });

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

module.exports = router;
