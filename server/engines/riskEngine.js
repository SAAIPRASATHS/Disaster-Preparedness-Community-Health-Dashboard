const axios = require('axios');

const RISK_THRESHOLDS = {
    flood: { rainfall: 50, humidity: 85, windCeiling: 20 },
    heatwave: { temperature: 40 },
    cyclone: { windSpeed: 70 },
};

/* ── Fallback weather for when OpenWeather is unavailable ── */
const FALLBACK_WEATHER = {
    Mumbai: { temp: 32, humidity: 82, windSpeed: '14.4', rainfall: 12, description: 'scattered clouds' },
    Delhi: { temp: 38, humidity: 55, windSpeed: '11.2', rainfall: 0, description: 'haze' },
    Chennai: { temp: 34, humidity: 78, windSpeed: '18.0', rainfall: 8, description: 'light rain' },
    Kolkata: { temp: 33, humidity: 80, windSpeed: '12.6', rainfall: 5, description: 'partly cloudy' },
    Bangalore: { temp: 28, humidity: 65, windSpeed: '9.7', rainfall: 2, description: 'clear sky' },
    default: { temp: 30, humidity: 70, windSpeed: '12.0', rainfall: 3, description: 'partly cloudy' },
};

function getFallbackWeather(city) {
    const key = Object.keys(FALLBACK_WEATHER).find(
        (k) => k.toLowerCase() === city.toLowerCase()
    );
    return { ...(FALLBACK_WEATHER[key] || FALLBACK_WEATHER.default) };
}

function buildRisks(weather) {
    const risks = [];

    // --- Flood ---
    const floodByRain = weather.rainfall > RISK_THRESHOLDS.flood.rainfall;
    const floodByHumidity =
        weather.humidity > RISK_THRESHOLDS.flood.humidity &&
        parseFloat(weather.windSpeed) < RISK_THRESHOLDS.flood.windCeiling;

    if (floodByRain || floodByHumidity) {
        const score = floodByRain
            ? Math.min(0.95, 0.5 + (weather.rainfall - 50) / 100)
            : Math.min(0.85, 0.4 + (weather.humidity - 85) / 50);
        risks.push({
            disasterType: 'Flood',
            probabilityScore: parseFloat(score.toFixed(2)),
            riskLevel: score >= 0.7 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'LOW',
            confidenceScore: floodByRain ? 0.85 : 0.6,
            recommendedPreparedness: [
                'Move to higher ground immediately',
                'Store drinking water (4L per person per day for 3 days)',
                'Keep documents in waterproof bags',
                'Charge phones and power banks fully',
                'Prepare an emergency evacuation bag',
            ],
            secondaryHealthRisks: ['Dengue', 'Waterborne diseases', 'Leptospirosis'],
        });
    }

    // --- Heatwave ---
    if (weather.temp >= RISK_THRESHOLDS.heatwave.temperature) {
        const score = Math.min(0.95, 0.5 + (weather.temp - 40) / 20);
        risks.push({
            disasterType: 'Heatwave',
            probabilityScore: parseFloat(score.toFixed(2)),
            riskLevel: score >= 0.7 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'LOW',
            confidenceScore: 0.9,
            recommendedPreparedness: [
                'Stay indoors between 11 AM – 4 PM',
                'Keep ORS packets ready',
                'Ensure continuous water intake (min 3L/day)',
                'Wear light cotton clothing',
                'Keep wet towels available for cooling',
            ],
            secondaryHealthRisks: ['Heat stroke', 'Dehydration', 'Sunburn'],
        });
    }

    // --- Cyclone ---
    if (parseFloat(weather.windSpeed) > RISK_THRESHOLDS.cyclone.windSpeed) {
        const score = Math.min(0.95, 0.5 + (parseFloat(weather.windSpeed) - 70) / 100);
        risks.push({
            disasterType: 'Cyclone',
            probabilityScore: parseFloat(score.toFixed(2)),
            riskLevel: score >= 0.7 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'LOW',
            confidenceScore: 0.8,
            recommendedPreparedness: [
                'Secure all doors and windows',
                'Keep emergency kit with flashlight, batteries, first-aid',
                'Fill bathtubs and containers with fresh water',
                'Identify nearest cyclone shelter',
                'Follow evacuation orders from local authorities',
            ],
            secondaryHealthRisks: ['Injuries', 'Waterborne diseases', 'Respiratory infections'],
        });
    }

    // No specific risk detected
    if (risks.length === 0) {
        risks.push({
            disasterType: 'General',
            probabilityScore: 0.05,
            riskLevel: 'LOW',
            confidenceScore: 0.95,
            recommendedPreparedness: [
                'No immediate disaster risk detected',
                'Maintain basic emergency supplies at home',
                'Stay updated with local weather forecasts',
            ],
            secondaryHealthRisks: [],
        });
    }

    return risks;
}

/**
 * Fetch weather from OpenWeatherMap and convert to disaster risk assessment.
 * Falls back to mock data if the API key is missing or the request fails.
 */
async function assessRisk(city) {
    let weather;
    let cityName = city;
    let country = 'IN';
    let isFallback = false;

    try {
        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey || apiKey.includes('your_')) {
            throw new Error('Weather API key not configured');
        }
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        const { data } = await axios.get(url);

        weather = {
            temp: data.main.temp,
            humidity: data.main.humidity,
            windSpeed: (data.wind.speed * 3.6).toFixed(1),
            rainfall: data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0,
            description: data.weather[0].description,
        };
        cityName = data.name;
        country = data.sys.country;
    } catch (err) {
        console.warn(`⚠️  Weather API fallback for "${city}":`, err.message);
        weather = getFallbackWeather(city);
        isFallback = true;
    }

    const risks = buildRisks(weather);

    // Generate 24h/48h risk timeline projection
    const riskTimeline = {
        next24h: risks.map((r) => ({
            disasterType: r.disasterType,
            projectedRisk: r.riskLevel,
            trend: r.probabilityScore > 0.5 ? 'increasing' : 'stable',
        })),
        next48h: risks.map((r) => ({
            disasterType: r.disasterType,
            projectedRisk: r.probabilityScore > 0.7 ? 'HIGH' : r.riskLevel,
            trend: r.probabilityScore > 0.6 ? 'increasing' : 'decreasing',
        })),
    };

    return {
        city: cityName,
        country,
        currentWeather: weather,
        assessedAt: new Date().toISOString(),
        isFallback,
        risks,
        riskTimeline,
    };
}

module.exports = { assessRisk };
