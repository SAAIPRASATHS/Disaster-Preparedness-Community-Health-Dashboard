/**
 * Seed script — Fetches ALL police, fire, hospital & food data for Tamil Nadu
 * from the OpenStreetMap Overpass API and seeds them into MongoDB.
 *
 * Usage: node server/seedTamilNaduOverpass.js
 *
 * ⚠️  This script fetches thousands of records. It may take 5-10 minutes.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Resource = require('./models/Resource');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// ── Overpass Queries ──
const QUERIES = [
    {
        label: '👮 Police Stations',
        type: 'police_station',
        query: `
            [out:json][timeout:1800];
            rel["name"="Tamil Nadu"]["boundary"="administrative"]["admin_level"="4"];
            map_to_area -> .searchArea;
            (
              node["amenity"="police"](area.searchArea);
              way["amenity"="police"](area.searchArea);
              relation["amenity"="police"](area.searchArea);
            );
            out center meta;
        `
    },
    {
        label: '🚒 Fire Stations',
        type: 'fire_station',
        query: `
            [out:json][timeout:1800];
            rel["name"="Tamil Nadu"]["boundary"="administrative"]["admin_level"="4"];
            map_to_area -> .searchArea;
            (
              node["amenity"="fire_station"](area.searchArea);
              way["amenity"="fire_station"](area.searchArea);
              relation["amenity"="fire_station"](area.searchArea);
            );
            out center meta;
        `
    },
    {
        label: '🏥 Hospitals & Clinics',
        type: 'hospital',
        query: `
            [out:json][timeout:1800];
            rel["name"="Tamil Nadu"]["boundary"="administrative"]["admin_level"="4"];
            map_to_area -> .searchArea;
            (
              node["amenity"="hospital"](area.searchArea);
              way["amenity"="hospital"](area.searchArea);
              relation["amenity"="hospital"](area.searchArea);
            );
            out center meta;
        `
    },
    {
        label: '🍱 Food / Emergency Food',
        type: 'food_point',
        query: `
            [out:json][timeout:1800];
            rel["name"="Tamil Nadu"]["boundary"="administrative"]["admin_level"="4"];
            map_to_area -> .searchArea;
            (
              node["amenity"~"restaurant|fast_food|cafe"](area.searchArea);
              way["amenity"~"restaurant|fast_food|cafe"](area.searchArea);
            );
            out center meta;
        `
    }
];

// ── Parse a single Overpass element ──
function parseElement(el, type) {
    // Nodes have lat/lon directly. Ways/relations use 'center' if available.
    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    if (!lat || !lon) return null;

    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || tags['name:ta'] || null;
    if (!name) return null; // skip unnamed entries

    const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '';
    const street = tags['addr:street'] || '';
    const city = tags['addr:city'] || tags['addr:suburb'] || '';
    const district = tags['addr:district'] || '';
    const address = [street, city, district].filter(Boolean).join(', ') || 'Tamil Nadu';

    return { name, type, lat, lon, contact: phone, address };
}

// ── Fetch from Overpass with retry ──
async function fetchOverpass(query, label) {
    console.log(`\n🔄 Fetching ${label}...`);
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 300000, // 5 min timeout
            });
            const elements = response.data.elements || [];
            console.log(`   ✅ Received ${elements.length} raw elements`);
            return elements;
        } catch (err) {
            console.log(`   ⚠️  Attempt ${attempt}/3 failed: ${err.message}`);
            if (attempt < 3) {
                console.log(`   ⏳ Waiting 30s before retry...`);
                await new Promise(r => setTimeout(r, 30000));
            }
        }
    }
    console.log(`   ❌ Failed after 3 attempts for ${label}`);
    return [];
}

// ── Main Seed Function ──
async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        let totalAdded = 0, totalSkipped = 0;

        for (const { label, type, query } of QUERIES) {
            const elements = await fetchOverpass(query, label);
            const parsed = elements.map(el => parseElement(el, type)).filter(Boolean);
            console.log(`   📊 Parsed ${parsed.length} named entries`);

            let added = 0, skipped = 0;

            // Batch in chunks of 100 for performance
            for (let i = 0; i < parsed.length; i += 100) {
                const batch = parsed.slice(i, i + 100);

                for (const svc of batch) {
                    const exists = await Resource.findOne({ name: svc.name, type: svc.type });
                    if (exists) {
                        skipped++;
                        continue;
                    }

                    await Resource.create({
                        name: svc.name,
                        type: svc.type,
                        address: svc.address,
                        contact: svc.contact,
                        location: {
                            type: 'Point',
                            coordinates: [svc.lon, svc.lat] // GeoJSON [lng, lat]
                        },
                        status: {
                            foodAvailable: svc.type === 'food_point',
                            lastUpdated: new Date()
                        }
                    });
                    added++;
                }

                // Progress indicator every 100
                if (parsed.length > 100) {
                    process.stdout.write(`\r   💾 Progress: ${Math.min(i + 100, parsed.length)}/${parsed.length}`);
                }
            }

            console.log(`\n   ✅ ${label}: Added ${added}, Skipped ${skipped} (duplicates)`);
            totalAdded += added;
            totalSkipped += skipped;

            // Be kind to the Overpass API — wait between queries
            console.log('   ⏳ Cooling down 10s before next category...');
            await new Promise(r => setTimeout(r, 10000));
        }

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🎉 COMPLETE! Total added: ${totalAdded}, skipped: ${totalSkipped}`);
        console.log(`📍 Coverage: All of Tamil Nadu`);
        console.log(`${'═'.repeat(50)}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
