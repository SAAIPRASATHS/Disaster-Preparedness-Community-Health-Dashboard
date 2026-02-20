const axios = require('axios');

const RISK_THRESHOLDS = {
    flood: { rainfall: 50, humidity: 85, windCeiling: 20 },
    heatwave: { temperature: 40 },
    cyclone: { windSpeed: 70 },
};

/* ── Fallback weather for when APIs are unavailable ── */
const FALLBACK_WEATHER = {
    Mumbai: { temp: 32, humidity: 82, windSpeed: '14.4', rainfall: 12, description: 'scattered clouds' },
    Delhi: { temp: 38, humidity: 55, windSpeed: '11.2', rainfall: 0, description: 'haze' },
    Chennai: { temp: 34, humidity: 78, windSpeed: '18.0', rainfall: 8, description: 'light rain' },
    Kolkata: { temp: 33, humidity: 80, windSpeed: '12.6', rainfall: 5, description: 'partly cloudy' },
    Bangalore: { temp: 28, humidity: 65, windSpeed: '9.7', rainfall: 2, description: 'clear sky' },
    default: { temp: 30, humidity: 70, windSpeed: '12.0', rainfall: 3, description: 'partly cloudy' },
};

const WMO_DESCRIPTIONS = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall',
    77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers',
    82: 'Violent rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
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
 * Geocode a city name to lat/lon using Open-Meteo Geocoding API (free, no key).
 */
async function geocodeCity(city) {
    const { data } = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: city, count: 1, language: 'en', format: 'json' },
    });
    if (!data.results || data.results.length === 0) {
        throw new Error(`City "${city}" not found`);
    }
    return data.results[0];
}

/**
 * Fetch weather from Open-Meteo (free, no API key) and convert to disaster risk assessment.
 * Falls back to mock data if the request fails.
 */
async function assessRisk(city) {
    let weather;
    let cityName = city;
    let country = 'IN';
    let isFallback = false;

    try {
        const geo = await geocodeCity(city);
        cityName = geo.name;
        country = geo.country_code || 'IN';

        const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: geo.latitude,
                longitude: geo.longitude,
                current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,rain,weather_code',
                timezone: 'auto',
            },
        });

        const c = data.current;
        weather = {
            temp: c.temperature_2m,
            humidity: c.relative_humidity_2m,
            windSpeed: c.wind_speed_10m.toFixed(1),
            rainfall: c.rain || 0,
            description: WMO_DESCRIPTIONS[c.weather_code] || 'Unknown',
        };
    } catch (err) {
        console.warn(`⚠️  Open-Meteo fallback for "${city}":`, err.message);
        weather = getFallbackWeather(city);
        isFallback = true;
    }

    const risks = buildRisks(weather);

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
