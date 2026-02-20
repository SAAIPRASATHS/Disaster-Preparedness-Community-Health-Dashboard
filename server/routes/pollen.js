const router = require('express').Router();
const axios = require('axios');

const POLLEN_LEVELS = [
    { max: 10, label: 'Very Low', color: '#4ade80' },
    { max: 30, label: 'Low', color: '#a3e635' },
    { max: 60, label: 'Moderate', color: '#facc15' },
    { max: 80, label: 'High', color: '#f97316' },
    { max: Infinity, label: 'Very High', color: '#ef4444' },
];

function getPollenLevel(value) {
    if (value === null || value === undefined) return { label: 'N/A', color: '#9ca3af' };
    return POLLEN_LEVELS.find((l) => value <= l.max) || POLLEN_LEVELS[POLLEN_LEVELS.length - 1];
}

/**
 * GET /api/pollen?lat=...&lon=... OR ?city=...
 * Uses Open-Meteo Air Quality API for pollen data (free, no API key)
 */
router.get('/', async (req, res) => {
    try {
        let { lat, lon, city } = req.query;

        if (city && (!lat || !lon)) {
            const { data: geoData } = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
                params: { name: city, count: 1, language: 'en', format: 'json' },
            });
            if (!geoData.results || geoData.results.length === 0) {
                return res.status(404).json({ error: `City "${city}" not found` });
            }
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
            city = geoData.results[0].name;
        }

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Either city or lat/lon coordinates are required' });
        }

        const { data } = await axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
            params: {
                latitude: lat,
                longitude: lon,
                current: 'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
                timezone: 'auto',
            },
        });

        const c = data.current;
        const isFallbackRegion = c.grass_pollen === null || c.grass_pollen === undefined;

        let types = [
            { key: 'grass_pollen', label: 'Grass', emoji: '🌾', value: c.grass_pollen },
            { key: 'birch_pollen', label: 'Birch', emoji: '🌳', value: c.birch_pollen },
            { key: 'alder_pollen', label: 'Alder', emoji: '🌲', value: c.alder_pollen },
            { key: 'ragweed_pollen', label: 'Ragweed', emoji: '🌿', value: c.ragweed_pollen },
            { key: 'mugwort_pollen', label: 'Mugwort', emoji: '🍃', value: c.mugwort_pollen },
            { key: 'olive_pollen', label: 'Olive', emoji: '🫒', value: c.olive_pollen },
        ];

        // --- Geo-Seasonal Fallback Model for Global Coverage ---
        if (isFallbackRegion) {
            const month = new Date().getMonth(); // 0-11 (Jan-Dec)
            const isNorthernHemisphere = parseFloat(lat) > 0;

            // Basic seasonal curve simulation
            const getEstimate = (base, peakMonth, width = 2) => {
                const diff = Math.min(Math.abs(month - peakMonth), 12 - Math.abs(month - peakMonth));
                const factor = Math.max(0, 1 - (diff / width));
                return Math.round(base * factor);
            };

            // Estimations based on Northern Hemisphere (India/Global North)
            if (isNorthernHemisphere) {
                types[0].value = getEstimate(45, 8, 3); // Grass peak in Late Summer/Monsoon
                types[1].value = getEstimate(60, 3, 2); // Birch peak in Spring
                types[2].value = getEstimate(50, 2, 2); // Alder peak in Late Winter/Spring
                types[3].value = getEstimate(30, 9, 2); // Ragweed peak in Autumn
                types[4].value = getEstimate(25, 8, 2); // Mugwort peak in Summer
                types[5].value = getEstimate(40, 4, 3); // Olive peak in Spring
            } else {
                // Simplified Southern Hemisphere (6 months shift)
                const shMonth = (month + 6) % 12;
                types[0].value = getEstimate(45, (8 + 6) % 12, 3);
                // ... others would be similar.
            }
        }

        const pollenData = types.map((t) => {
            const level = getPollenLevel(t.value);
            return {
                type: t.label,
                emoji: t.emoji,
                value: t.value,
                unit: 'grains/m³',
                level: level.label,
                color: level.color,
            };
        });

        // Overall pollen severity
        const maxVal = Math.max(...types.map((t) => t.value || 0));
        const overallLevel = getPollenLevel(maxVal);

        res.json({
            name: city || `${lat}, ${lon}`,
            overall: { level: overallLevel.label, color: overallLevel.color },
            types: pollenData,
            isEstimated: isFallbackRegion,
            advice: maxVal > 60
                ? 'Pollen levels are high. Consider staying indoors, keep windows closed, and take antihistamines if needed.'
                : maxVal > 30
                    ? 'Moderate pollen levels. People with allergies should be cautious outdoors.'
                    : 'Pollen levels are low. Safe for outdoor activities.',
        });
    } catch (err) {
        console.error('Pollen API Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch pollen data' });
    }
});

module.exports = router;
