const router = require('express').Router();
const axios = require('axios');

const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

router.get('/', async (req, res) => {
    try {
        const { lat, lon, city } = req.query;

        if (!OPENWEATHER_API_KEY) {
            return res.status(500).json({ error: 'OPENWEATHER_API_KEY is not configured on the server' });
        }

        let params = {
            appid: OPENWEATHER_API_KEY,
            units: 'metric',
        };

        if (lat && lon) {
            params.lat = lat;
            params.lon = lon;
        } else if (city) {
            params.q = city;
        } else {
            return res.status(400).json({ error: 'Either city or lat/lon coordinates are required' });
        }

        const response = await axios.get(OPENWEATHER_API_URL, { params });
        res.json(response.data);
    } catch (err) {
        console.error('Weather API Error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json({ error: 'Failed to fetch weather data' });
    }
});

module.exports = router;
