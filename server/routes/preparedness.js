const express = require('express');
const { generateChecklist } = require('../engines/preparednessEngine');
const { enhancePreparedness } = require('../engines/groqEngine');

const router = express.Router();

// POST /api/preparedness
router.post('/', async (req, res) => {
    try {
        const { disasterType, familyMembers, elderly, children, conditions } = req.body;

        if (!disasterType) {
            return res.status(400).json({ error: 'disasterType is required' });
        }

        const profile = {
            disasterType,
            familyMembers: parseInt(familyMembers) || 1,
            elderly: parseInt(elderly) || 0,
            children: parseInt(children) || 0,
            conditions: conditions || [],
        };

        // Generate rule-based checklist
        const checklist = generateChecklist(profile);

        // Enhance with Groq AI (non-blocking — falls back gracefully)
        const aiTips = await enhancePreparedness(profile);
        if (aiTips && Array.isArray(aiTips)) {
            checklist.aiEnhancedTips = aiTips;
        }

        res.json(checklist);
    } catch (err) {
        console.error('Preparedness error:', err.message);
        res.status(500).json({ error: 'Failed to generate checklist' });
    }
});

module.exports = router;
