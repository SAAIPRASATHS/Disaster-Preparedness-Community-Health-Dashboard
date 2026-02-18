const SymptomReport = require('../models/SymptomReport');

const OUTBREAK_RULES = [
    {
        id: 'viral',
        label: 'Viral Infection Outbreak',
        match: (counts) => counts.fever >= 10,
        confidence: (counts) => Math.min(0.95, 0.5 + (counts.fever - 10) / 40),
        actions: [
            'Deploy medical camp with fever medication',
            'Distribute ORS and paracetamol kits',
            'Issue public health advisory for the area',
            'Begin door-to-door health screening',
        ],
    },
    {
        id: 'waterborne',
        label: 'Waterborne Disease Outbreak',
        match: (counts) => (counts.vomiting || 0) + (counts.diarrhea || 0) >= 8,
        confidence: (counts) =>
            Math.min(0.95, 0.5 + ((counts.vomiting || 0) + (counts.diarrhea || 0) - 8) / 30),
        actions: [
            'Send water tankers with purified water',
            'Test local water supply for contamination',
            'Distribute water purification tablets',
            'Set up oral rehydration stations',
        ],
    },
    {
        id: 'respiratory',
        label: 'Respiratory Illness Spread',
        match: (counts) => counts.cough >= 10,
        confidence: (counts) => Math.min(0.95, 0.5 + (counts.cough - 10) / 40),
        actions: [
            'Distribute N95 masks in affected area',
            'Deploy mobile X-ray / testing unit',
            'Advise indoor ventilation improvements',
            'Start mosquito control (if dengue co-suspected)',
        ],
    },
];

/**
 * Analyse symptom reports from last 12 hours and detect outbreak clusters.
 */
async function detectClusters() {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // Aggregate reports by location
    const pipeline = [
        { $match: { createdAt: { $gte: twelveHoursAgo } } },
        { $unwind: '$symptoms' },
        {
            $group: {
                _id: { location: '$location', symptom: '$symptoms' },
                count: { $sum: 1 },
            },
        },
        {
            $group: {
                _id: '$_id.location',
                symptoms: {
                    $push: { symptom: '$_id.symptom', count: '$count' },
                },
                totalReports: { $sum: '$count' },
            },
        },
        { $sort: { totalReports: -1 } },
    ];

    const locationData = await SymptomReport.aggregate(pipeline);

    const clusters = [];

    for (const loc of locationData) {
        const counts = {};
        for (const s of loc.symptoms) {
            counts[s.symptom] = s.count;
        }

        for (const rule of OUTBREAK_RULES) {
            if (rule.match(counts)) {
                clusters.push({
                    area: loc._id,
                    predictedDiseaseType: rule.label,
                    detectionRule: rule.id,
                    symptomCounts: counts,
                    totalReports: loc.totalReports,
                    confidence: parseFloat(rule.confidence(counts).toFixed(2)),
                    recommendedAuthorityAction: rule.actions,
                });
            }
        }
    }

    return {
        analysedAt: new Date().toISOString(),
        windowHours: 12,
        clustersDetected: clusters.length,
        clusters,
    };
}

module.exports = { detectClusters };
