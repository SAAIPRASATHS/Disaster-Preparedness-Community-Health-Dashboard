/**
 * Seed script — adds Coimbatore fire stations with geocoding
 * 
 * Usage: node server/seedCoimbatoreFireData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');
const axios = require('axios');

const STATIONS = [
    { name: "Peelamedu Fire Station", contact: "0422-2595101" },
    { name: "Coimbatore South Fire Station", contact: "0422-2300101" },
    { name: "Kavundampalayam Fire Station", contact: "0422-2450101" },
    { name: "Ganapathy Fire Station", contact: "0422-2511001" },
    { name: "Mettupalayam Fire Station", contact: "0422-222299" },
    { name: "Palladam Fire Station", contact: "253110" }
];

async function geocode(name) {
    try {
        const query = `${name}, Coimbatore, Tamil Nadu, India`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'DisasterPrepDashboard/1.0' }
        });
        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lon: parseFloat(response.data[0].lon),
                address: response.data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error(`Geocoding failed for ${name}:`, error.message);
        return null;
    }
}

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        let added = 0;
        for (const station of STATIONS) {
            const exists = await Resource.findOne({ name: station.name });
            if (exists) {
                console.log(`⏭️  Skipped (exists): ${station.name}`);
                continue;
            }

            console.log(`🔍 Geocoding: ${station.name}...`);
            const geo = await geocode(station.name);

            // Fallback to random offset near Coimbatore center if geocoding fails
            const lat = geo ? geo.lat : 11.0168 + (Math.random() - 0.5) * 0.1;
            const lon = geo ? geo.lon : 76.9558 + (Math.random() - 0.5) * 0.1;
            const address = geo ? geo.address : `Coimbatore, Tamil Nadu`;

            await Resource.create({
                name: station.name,
                type: 'fire_station',
                address: address,
                contact: station.contact,
                location: {
                    type: 'Point',
                    coordinates: [lon, lat]
                }
            });
            added++;
            console.log(`✅ Added: ${station.name} (${station.contact})`);

            // Be nice to Nominatim
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n🎉 Done! Added ${added} new fire stations.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
