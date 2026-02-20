const router = require('express').Router();
const axios = require('axios');

const AQI_LEVELS = [
    { max: 20, label: 'Good', color: '#4ade80', advice: 'Air quality is excellent. Enjoy outdoor activities!' },
    { max: 40, label: 'Fair', color: '#a3e635', advice: 'Air quality is acceptable. Sensitive individuals should limit outdoor exertion.' },
    { max: 60, label: 'Moderate', color: '#facc15', advice: 'May cause discomfort for sensitive groups. Reduce prolonged outdoor exertion.' },
    { max: 80, label: 'Poor', color: '#f97316', advice: 'Health effects possible for everyone. Limit outdoor activities.' },
    { max: 100, label: 'Very Poor', color: '#ef4444', advice: 'Serious health risk. Avoid outdoor activities.' },
    { max: Infinity, label: 'Hazardous', color: '#7f1d1d', advice: 'Emergency conditions. Stay indoors with windows closed.' },
];

function getAqiInfo(aqi) {
    return AQI_LEVELS.find((l) => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

/**
 * GET /api/airquality?lat=...&lon=... OR ?city=...
 * Uses Open-Meteo Air Quality API (free, no API key)
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
                current: 'european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
                timezone: 'auto',
            },
        });

        const c = data.current;
        const aqiValue = c.european_aqi || 0;
        const aqiInfo = getAqiInfo(aqiValue);

        res.json({
            name: city || `${lat}, ${lon}`,
            aqi: aqiValue,
            level: aqiInfo.label,
            color: aqiInfo.color,
            advice: aqiInfo.advice,
            pollutants: {
                pm25: { value: c.pm2_5, unit: 'μg/m³', label: 'PM2.5' },
                pm10: { value: c.pm10, unit: 'μg/m³', label: 'PM10' },
                co: { value: c.carbon_monoxide, unit: 'μg/m³', label: 'CO' },
                no2: { value: c.nitrogen_dioxide, unit: 'μg/m³', label: 'NO₂' },
                so2: { value: c.sulphur_dioxide, unit: 'μg/m³', label: 'SO₂' },
                o3: { value: c.ozone, unit: 'μg/m³', label: 'O₃' },
            },
        });
    } catch (err) {
        console.error('Air Quality API Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch air quality data' });
    }
});

module.exports = router;
