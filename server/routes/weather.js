const router = require('express').Router();
const axios = require('axios');

const WMO_ICONS = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
    71: '🌨️', 73: '🌨️', 75: '❄️', 95: '⛈️', 96: '⛈️', 99: '⛈️',
};

const WMO_DESCRIPTIONS = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

/**
 * GET /api/weather?lat=...&lon=... OR ?city=...
 * Uses Open-Meteo (free, no API key needed)
 */
router.get('/', async (req, res) => {
    try {
        let { lat, lon, city } = req.query;

        // Geocode if city name provided
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

        const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,rain',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min,rain_sum,wind_speed_10m_max',
                timezone: 'auto',
                forecast_days: 7,
            },
        });

        const current = data.current;
        const daily = data.daily;

        const forecast = daily.time.map((date, i) => ({
            date,
            tempMax: daily.temperature_2m_max[i],
            tempMin: daily.temperature_2m_min[i],
            rain: daily.rain_sum[i],
            windMax: daily.wind_speed_10m_max[i],
            weatherCode: daily.weather_code[i],
            icon: WMO_ICONS[daily.weather_code[i]] || '🌡️',
            description: WMO_DESCRIPTIONS[daily.weather_code[i]] || 'Unknown',
        }));

        res.json({
            name: city || `${lat}, ${lon}`,
            current: {
                temp: current.temperature_2m,
                feelsLike: current.apparent_temperature,
                humidity: current.relative_humidity_2m,
                windSpeed: current.wind_speed_10m,
                rain: current.rain,
                weatherCode: current.weather_code,
                icon: WMO_ICONS[current.weather_code] || '🌡️',
                description: WMO_DESCRIPTIONS[current.weather_code] || 'Unknown',
            },
            forecast,
        });
    } catch (err) {
        console.error('Weather API Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

module.exports = router;
