const express = require('express');
const SymptomReport = require('../models/SymptomReport');

const router = express.Router();

// ── AI Health Assessment (rule-based) ──────────────────────────────────────
function generateAIAssessment(symptoms, severity) {
    const s = symptoms.map(x => x.toLowerCase());
    const hasFever = s.includes('fever');
    const hasCough = s.includes('cough');
    const hasBreathing = s.includes('breathing_issues');
    const hasChestPain = s.includes('chest_pain');
    const hasDiarrhea = s.includes('diarrhea');
    const hasVomiting = s.includes('vomiting');
    const hasRash = s.includes('rash');

    let condition = 'General Illness';
    let riskLevel = severity === 'severe' ? 'High' : severity === 'moderate' ? 'Medium' : 'Low';
    let recommendation = 'Rest, stay hydrated, and monitor your symptoms.';

    if (hasBreathing || hasChestPain) {
        condition = 'Possible Respiratory Emergency';
        riskLevel = 'Critical';
        recommendation = 'Seek immediate medical attention. Call 112 or visit the nearest emergency room.';
    } else if (hasFever && hasCough && hasBreathing) {
        condition = 'Possible Pneumonia / Severe Respiratory Infection';
        riskLevel = 'High';
        recommendation = 'Visit a hospital immediately. Avoid contact with others.';
    } else if (hasFever && hasCough) {
        condition = 'Seasonal Flu / Viral Fever';
        riskLevel = severity === 'severe' ? 'High' : 'Medium';
        recommendation = 'Rest, drink fluids, and take fever medication. Seek medical help if fever exceeds 103°F.';
    } else if (hasDiarrhea && hasVomiting) {
        condition = 'Gastroenteritis / Food Poisoning';
        riskLevel = severity === 'severe' ? 'High' : 'Medium';
        recommendation = 'Oral rehydration is critical. Avoid solid food. Seek medical help if symptoms persist beyond 24 hours.';
    } else if (hasDiarrhea) {
        condition = 'Gastrointestinal Infection';
        riskLevel = 'Medium';
        recommendation = 'Use oral rehydration salts. Avoid contaminated food and water. See a doctor if blood in stool.';
    } else if (hasRash && hasFever) {
        condition = 'Possible Viral Exanthem / Dengue';
        riskLevel = 'High';
        recommendation = 'Consult a doctor immediately for dengue/viral testing. Avoid mosquito exposure.';
    } else if (hasRash) {
        condition = 'Skin Reaction / Allergy';
        riskLevel = 'Low';
        recommendation = 'Avoid irritants. Take antihistamines if needed. See a dermatologist if rash spreads.';
    } else if (hasFever) {
        condition = 'Viral Fever';
        riskLevel = 'Medium';
        recommendation = 'Rest and stay hydrated. Use paracetamol for fever management. Seek help if fever lasts > 3 days.';
    }

    return { condition, riskLevel, recommendation };
}

// POST /api/report
router.post('/', async (req, res) => {
    try {
        const { location, symptoms, ageGroup, severity, duration } = req.body;

        if (!location || !symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({ error: 'location and symptoms[] are required' });
        }

        const { condition, riskLevel, recommendation } = generateAIAssessment(symptoms, severity || 'mild');

        const report = await SymptomReport.create({
            location: location.trim().toLowerCase(),
            symptoms,
            userId: req.user?.id,
            userName: req.user?.name || 'Citizen',
            ageGroup: ageGroup || 'adult',
            severity: severity || 'mild',
            duration: duration || 'less_than_1_day',
            aiCondition: condition,
            aiRiskLevel: riskLevel,
            aiRecommendation: recommendation,
        });

        // WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('new-report', {
                id: report._id,
                location: report.location,
                symptoms: report.symptoms,
                severity: report.severity,
                userName: report.userName,
                createdAt: report.createdAt,
            });
        }

        res.status(201).json({
            message: 'Health report submitted successfully',
            report,
            assessment: { condition, riskLevel, recommendation },
        });
    } catch (err) {
        console.error('Report submission error:', err.message);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// GET /api/report — list reports (admin)
router.get('/', async (req, res) => {
    try {
        const reports = await SymptomReport.findAll(100);
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// GET /api/report/stats — health pulse stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await SymptomReport.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// PATCH /api/report/:id/status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const report = await SymptomReport.updateStatus(req.params.id, status);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
