const express = require('express');
const { detectClusters } = require('../engines/clusterEngine');
const { enhanceOutbreakAnalysis } = require('../engines/groqEngine');

const router = express.Router();

// GET /api/cluster
router.get('/', async (req, res) => {
    try {
        const result = await detectClusters();

        // Enhance with AI briefing if clusters exist
        if (result.clusters.length > 0) {
            const aiBriefing = await enhanceOutbreakAnalysis(result.clusters);
            if (aiBriefing) {
                result.aiBriefing = aiBriefing;
            }
        }

        res.json(result);
    } catch (err) {
        console.error('Cluster detection error:', err.message);
        res.status(500).json({ error: 'Failed to detect clusters' });
    }
});

module.exports = router;
