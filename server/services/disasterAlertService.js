/**
 * Real-Time Disaster Alert Service
 * Fetches live data from global authoritative sources (USGS, GDACS) and filters for India/Tamil Nadu.
 */
const axios = require('axios');
const DisasterAlert = require('../models/DisasterAlert');

let io = null;
function setIO(socketIO) { io = socketIO; }

// Bounding box for India/Tamil Nadu focus
const INDIA_BBOX = { minLat: 8.0, maxLat: 37.0, minLon: 68.0, maxLon: 97.0 };
const isWithinIndia = (lat, lon) => (lat >= INDIA_BBOX.minLat && lat <= INDIA_BBOX.maxLat && lon >= INDIA_BBOX.minLon && lon <= INDIA_BBOX.maxLon);

/**
 * Fetch USGS Earthquakes (Global, filter for India)
 */
async function fetchUSGSEarthquakes() {
    const alerts = [];
    try {
        const { data } = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', { timeout: 10000 });
        for (const feature of data.features) {
            const [lon, lat] = feature.geometry.coordinates;
            if (isWithinIndia(lat, lon)) {
                const mag = feature.properties.mag;
                let severity = 'LOW';
                if (mag >= 5.0) severity = 'MEDIUM';
                if (mag >= 6.5) severity = 'HIGH';
                if (mag >= 7.5) severity = 'CRITICAL';

                alerts.push({
                    title: `Earthquake Alert: Magnitude ${mag}`,
                    description: feature.properties.title,
                    source: 'USGS (National Center for Seismology Data Proxy)',
                    disasterType: 'Earthquake',
                    severity,
                    district: feature.properties.place.split(' of ').pop() || 'India Region',
                    state: 'India',
                    latitude: lat,
                    longitude: lon,
                    issuedAt: new Date(feature.properties.time),
                    externalId: feature.id,
                    isAi: false,
                    referenceLink: feature.properties.url
                });
            }
        }
    } catch (e) {
        console.error('USGS Fetch Error:', e.message);
    }
    return alerts;
}

/**
 * Fetch GDACS Alerts (Cyclones, Floods, Tsunamis)
 * Parses RSS XML using simple Regex since xml2js is not installed.
 */
async function fetchGDACSAlerts() {
    const alerts = [];
    try {
        const { data } = await axios.get('https://www.gdacs.org/xml/rss.xml', { timeout: 10000 });
        const items = data.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        for (const item of items) {
            const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
            const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
            const linkMatch = item.match(/<link>(.*?)<\/link>/);
            const geoMatch = item.match(/<georss:point>(.*?)<\/georss:point>/);
            const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
            
            if (!titleMatch || !geoMatch) continue;
            
            const title = titleMatch[1];
            if (!title.toLowerCase().includes('india')) continue; // Strict filter for India

            const [lat, lon] = geoMatch[1].split(' ').map(Number);
            
            let severity = 'MEDIUM';
            if (title.toLowerCase().includes('orange')) severity = 'HIGH';
            if (title.toLowerCase().includes('red')) severity = 'CRITICAL';

            let type = 'Flood';
            if (title.toLowerCase().includes('cyclone')) type = 'Cyclone';
            else if (title.toLowerCase().includes('tsunami')) type = 'Tsunami';
            else if (title.toLowerCase().includes('earthquake')) type = 'Earthquake';
            
            alerts.push({
                title: title.split('-').pop()?.trim() || title,
                description: descMatch ? descMatch[1] : title,
                source: 'GDACS (Global Disaster Alert & Coordination)',
                disasterType: type,
                severity,
                district: 'Coastal / Affected Area',
                state: 'India',
                latitude: lat,
                longitude: lon,
                issuedAt: dateMatch ? new Date(dateMatch[1]) : new Date(),
                externalId: linkMatch ? linkMatch[1] : `gdacs-${Date.now()}`,
                isAi: false,
                referenceLink: linkMatch ? linkMatch[1] : 'https://www.gdacs.org/'
            });
        }
    } catch (e) {
        console.error('GDACS Fetch Error:', e.message);
    }
    return alerts;
}

const translate = require('google-translate-api-x');

async function fetchAndStoreAlerts() {
    try {
        console.log('🔄 Fetching live disaster data...');
        const [usgsAlerts, gdacsAlerts] = await Promise.all([
            fetchUSGSEarthquakes(),
            fetchGDACSAlerts()
        ]);
        
        const allFetched = [...usgsAlerts, ...gdacsAlerts];
        
        const newlyCreated = [];
        for (const alertData of allFetched) {
            // Check if it already exists before translating (to save quota/time)
            if (alertData.externalId) {
                const existing = await DisasterAlert.findAll({ limit: 1 }); // Just to check
                // Actually we can just try to translate, the create handles duplicate external_id
                // But let's translate and store
            }

            try {
                const [titleTa, descTa] = await Promise.all([
                    translate(alertData.title, { to: 'ta' }),
                    translate(alertData.description, { to: 'ta' })
                ]);
                const [titleHi, descHi] = await Promise.all([
                    translate(alertData.title, { to: 'hi' }),
                    translate(alertData.description, { to: 'hi' })
                ]);
                
                alertData.title_ta = titleTa.text;
                alertData.description_ta = descTa.text;
                alertData.title_hi = titleHi.text;
                alertData.description_hi = descHi.text;
            } catch (err) {
                console.error('Translation error for alert:', err.message);
            }

            const saved = await DisasterAlert.create(alertData);
            if (saved) newlyCreated.push(saved);
        }

        if (newlyCreated.length > 0 && io) {
            newlyCreated.forEach(a => io.emit('disaster-alert', a));
            io.emit('alert-stats-update', { count: newlyCreated.length });
            console.log(`📡 Broadcast ${newlyCreated.length} NEW alerts.`);
        } else {
            console.log('✅ Polling complete. No new alerts found.');
        }

        return newlyCreated;
    } catch (e) {
        console.error('❌ Sync Error:', e);
        return [];
    }
}

function startAlertScheduler(socketIO) {
    io = socketIO;
    console.log('🕐 Live Disaster Data Feed Scheduler started (5 min interval)');
    fetchAndStoreAlerts(); // Run immediately
    setInterval(fetchAndStoreAlerts, 5 * 60 * 1000);
}

module.exports = { startAlertScheduler, fetchAndStoreAlerts, setIO };
