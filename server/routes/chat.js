const router = require('express').Router();
const axios = require('axios');
const Resource = require('../models/Resource');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ── Helper: Reverse geocode coordinates ──
async function reverseGeocode(lat, lon) {
    try {
        const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat, lon, format: 'json' },
            headers: { 'User-Agent': 'DisasterPreparednessApp/1.0' }
        });
        if (data && data.address) {
            const addr = data.address;
            let name = addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || addr.county || 'Unknown Location';
            const parent = addr.city || addr.state;
            if (parent && name !== parent) name = `${name}, ${parent}`;
            return name;
        }
    } catch (err) {
        console.error('Reverse Geocode Error:', err.message);
    }
    return null;
}

// ── Helper: Geocode a city name ──
async function geocodeCity(city) {
    const { data } = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: city, count: 1, language: 'en', format: 'json' },
    });
    if (!data.results || data.results.length === 0) return null;
    return data.results[0];
}

// ── Helper: Fetch weather + forecast for coordinates ──
async function fetchWeather(lat, lon) {
    const WMO = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
        55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
    };
    const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
            latitude: lat, longitude: lon,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,rain',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,rain_sum,precipitation_probability_max',
            timezone: 'auto', forecast_days: 7,
        },
    });
    const c = data.current;
    const d = data.daily;
    return {
        current: {
            temp: c.temperature_2m, feelsLike: c.apparent_temperature,
            humidity: c.relative_humidity_2m, wind: c.wind_speed_10m,
            rain: c.rain, description: WMO[c.weather_code] || 'Unknown',
        },
        forecast: d.time.map((date, i) => ({
            date, maxTemp: d.temperature_2m_max[i], minTemp: d.temperature_2m_min[i],
            rain_mm: d.rain_sum[i], rain_chance: d.precipitation_probability_max[i],
            description: WMO[d.weather_code[i]] || 'Unknown',
        })),
    };
}

// ── Helper: Fetch air quality ──
async function fetchAirQuality(lat, lon) {
    const { data } = await axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
        params: {
            latitude: lat, longitude: lon,
            current: 'european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
            timezone: 'auto',
        },
    });
    const c = data.current;
    return { aqi: c.european_aqi, pm25: c.pm2_5, pm10: c.pm10, co: c.carbon_monoxide, no2: c.nitrogen_dioxide, so2: c.sulphur_dioxide, o3: c.ozone };
}

// ── Main Chat Endpoint ──
router.post('/', async (req, res) => {
    try {
        const { messages, context } = req.body;
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server' });
        }

        const lastMsg = messages[messages.length - 1]?.content || '';

        // Clean messages: Groq only accepts 'role' and 'content'
        const cleanMessages = messages.map(m => ({
            role: m.role,
            content: m.content
        }));
        const extractRes = await axios.post(GROQ_API_URL, {
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `You are a JSON extractor. Analyze the user message and output ONLY a JSON object with these fields:
- "needs_weather": boolean (true if user asks about weather, rain, temperature, forecast, climate, storm, humidity, wind)
- "needs_airquality": boolean (true if user asks about air quality, pollution, AQI, PM2.5, smog)
- "needs_resources": boolean (true if user asks about nearby services like fire stations, police stations, hospitals, hotels, food, shelters, rescue teams, emergency services, or anything "near me")
- "resource_type": string or null (one of: "fire_station", "police_station", "hotel", "food_point", "hospital", "government_office", "rescue_center", or null if not asking about resources. If user asks about multiple or all, use "all")
- "cities": string[] (list of city names mentioned; if user says "my area" or "here" or "my surrounding", use empty array)
- "is_comparison": boolean (true if user is comparing multiple cities or asking about max/min across locations)
Output ONLY valid JSON, no markdown, no explanation.`,
                },
                { role: 'user', content: lastMsg },
            ],
            temperature: 0,
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        });

        let intent = { needs_weather: false, needs_airquality: false, needs_resources: false, resource_type: null, cities: [], is_comparison: false };
        try {
            const raw = extractRes.data.choices[0].message.content.trim();
            intent = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
        } catch (e) {
            console.error('Intent parse error:', e.message);
        }

        // ── Step 2: Fetch real data if needed ──
        let envData = {};
        let resourceData = [];

        // Resolve location name if context has coordinates but name is missing or just coords
        if (context?.lat && context?.lon) {
            const isCoords = !context.location || /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(String(context.location));
            if (isCoords) {
                const resolvedName = await reverseGeocode(context.lat, context.lon);
                if (resolvedName) context.location = resolvedName;
            }
        }

        // If cities are mentioned, fetch data for each
        if ((intent.needs_weather || intent.needs_airquality) && intent.cities.length > 0) {
            for (const city of intent.cities.slice(0, 5)) {
                const geo = await geocodeCity(city);
                if (!geo) continue;
                const cityData = { name: geo.name, country: geo.country || '' };
                if (intent.needs_weather) cityData.weather = await fetchWeather(geo.latitude, geo.longitude);
                if (intent.needs_airquality) cityData.airQuality = await fetchAirQuality(geo.latitude, geo.longitude);
                envData[city] = cityData;
            }
        }

        // If no cities but context has location, use context location
        if ((intent.needs_weather || intent.needs_airquality) && intent.cities.length === 0 && context) {
            envData['user_location'] = context;
        }

        // ── Step 2b: Fetch nearby resources if needed ──
        if (intent.needs_resources) {
            try {
                // Determine coordinates: use context location, geocoded city, or default
                let rLat = null, rLon = null;
                if (context?.lat && context?.lon) {
                    rLat = context.lat;
                    rLon = context.lon;
                } else if (intent.cities.length > 0) {
                    const geo = await geocodeCity(intent.cities[0]);
                    if (geo) { rLat = geo.latitude; rLon = geo.longitude; }
                }

                let query = {};
                // Filter by type if specified
                if (intent.resource_type && intent.resource_type !== 'all') {
                    query.type = intent.resource_type;
                }

                // Only use geospatial query if we have valid coordinates
                if (rLat !== null && rLon !== null) {
                    query.location = {
                        $near: {
                            $geometry: { type: 'Point', coordinates: [rLon, rLat] },
                            $maxDistance: 500000 // 500km — expanded since DB currently only has Mumbai seeds
                        }
                    };
                }

                const resources = await Resource.find(query).limit(10);
                resourceData = resources.map(r => ({
                    name: r.name,
                    type: r.type.replace('_', ' '),
                    address: r.address,
                    contact: r.contact,
                    distanceNote: (rLat !== null && rLon !== null) ? undefined : 'distance unknown (location not shared)',
                    foodAvailable: r.type === 'food_point' ? r.status.foodAvailable : undefined
                }));
            } catch (err) {
                console.error('Resource fetch error:', err.message);
            }
        }

        // ── Season & TN helpline context (TN DMP) ──
        const nowMonth = new Date().getMonth() + 1; // 1–12
        const season = (nowMonth >= 6 && nowMonth <= 9)
            ? 'Southwest Monsoon (flood risk elevated — June to September)'
            : (nowMonth >= 10 && nowMonth <= 12)
                ? 'Northeast Monsoon / Cyclone Season (coastal alerts — October to December)'
                : (nowMonth >= 3 && nowMonth <= 5)
                    ? 'Pre-Monsoon / Heatwave Season (March to May)'
                    : 'Dry Season (January to February)';

        // ── Step 3: Final AI response with real data ──
        let systemPrompt = `You are an expert disaster preparedness, weather, and environmental health assistant.

CRITICAL RULES:
1. DATA USAGE: You have access to REAL-TIME data provided below. Use ONLY information from this data.
2. NO HYBRIDS/HALLUCINATION: If the user asks for "hospital", ONLY talk about hospitals found in the data. NEVER mix categories (e.g., don't mention a police station's location if a hospital was requested).
3. LIST ALL RESOURCES: You MUST list ALL relevant entries from the provided JSON. Do NOT summarize or skip any.
4. RESOURCE PRESENTATION:
   - **Pure Translation**: Translate the Name and all details. No English in parentheses.
   - Use labels: முகவரி (Address), தொடர்பு (Contact), வகை (Type).
   - If no contact is provided, say "தொடர்பு எண் இல்லை" (No contact number).
   - ALL explanatory text must be 100% in the target language.
5. NO PARENTHESES: Use the target language script only. "Prema Hospital" -> "பிரேமா மருத்துவமனை". Never "Prema Hospital (பிரேமா மருத்துவமனை)".
6. MULTILINGUAL SUPPORT (LETHAL ENFORCEMENT): 
   - No mixed-language labels. Constant target language.
   - Professional, clear, and extremely fast response tone.
7. COIMBATORE/TN CONTEXT: ...
9. CURRENT SEASONAL CONTEXT: It is currently ${season}.
10. TAMIL NADU EMERGENCY HELPLINES: Cite SDRF (1077), Flood (1800-425-1077), Ambulance (108), etc. when relevant.`;


        if (Object.keys(envData).length > 0) {
            systemPrompt += `\n\nREAL-TIME ENVIRONMENTAL DATA (use ONLY these exact values):\n${JSON.stringify(envData, null, 2)}`;
        } else if (context && (intent.needs_weather || intent.needs_airquality)) {
            systemPrompt += `\n\nUSER'S LOCAL REAL-TIME DATA (use ONLY these exact values):\n${JSON.stringify(context, null, 2)}`;
        } else if (intent.needs_weather || intent.needs_airquality) {
            systemPrompt += `\n\nNO REAL-TIME DATA AVAILABLE for the specific location requested. Prompt the user to share their location or specify a city.`;
        }

        // Add resource data if available
        if (resourceData.length > 0) {
            const userLocation = context?.location || 'unknown location';
            systemPrompt += `\n\nUSER'S DETECTED LOCATION: ${userLocation} (lat: ${context?.lat || 'unknown'}, lon: ${context?.lon || 'unknown'})`;
            systemPrompt += `\n\nNEARBY RESOURCES FROM OUR DATABASE (present these EXACTLY as listed, and mention if the resources are in a different city than the user's location):\n${JSON.stringify(resourceData, null, 2)}`;
        } else if (intent.needs_resources) {
            const userLocation = context?.location || 'your area';
            systemPrompt += `\n\nNo matching resources found in our database near ${userLocation}. Our database currently covers limited areas. Suggest the user check Google Maps or call 112 (Emergency in India) for their local area.`;
        }

        const response = await axios.post(GROQ_API_URL, {
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: systemPrompt },
                ...cleanMessages,
            ],
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        });

        res.json(response.data.choices[0].message);
    } catch (err) {
        console.error('Groq Chat Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to communicate with Groq AI' });
    }
});

// ── Translation Endpoint ──
router.post('/translate', async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
        }

        const response = await axios.post(GROQ_API_URL, {
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional translator. Translate the provided text to ${targetLanguage}. 
                    Maintain the original tone, emojis, and markdown formatting. 
                    Output ONLY the translated text, no explanations.`
                },
                { role: 'user', content: text }
            ],
            temperature: 0.3,
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        });

        res.json({ translatedText: response.data.choices[0].message.content.trim() });
    } catch (err) {
        console.error('Translation Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to translate message' });
    }
});

module.exports = router;
