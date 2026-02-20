/**
 * Seed script — adds Coimbatore major tanks (water bodies) from report
 * 
 * Usage: node server/seedCoimbatoreWaterBodies.js
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Resource = require('./models/Resource');
const axios = require('axios');

const WATER_BODIES = [
    { name: "Singanallur Tank", address: "Singanallur, Coimbatore" },
    { name: "Valankulam Tank", address: "Sungam, Coimbatore" },
    { name: "Ukkadam Periyakulam Tank", address: "Ukkadam, Coimbatore" },
    { name: "Selvampathy Tank", address: "Kumaraswamy Nagar, Coimbatore" },
    { name: "Narasampathi Tank", address: "Vadavalli Road, Coimbatore" },
    { name: "Krishnampathi Tank", address: "Seeranaickenpalayam, Coimbatore" },
    { name: "Selvachinthamani Tank", address: "Thadagam Road, Coimbatore" },
    { name: "Kumaraswami Tank", address: "Muthannan Kulam, Coimbatore" }
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
                fullName: response.data[0].display_name
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
        for (const tank of WATER_BODIES) {
            const exists = await Resource.findOne({ name: tank.name });
            if (exists) {
                console.log(`⏭️  Skipped (exists): ${tank.name}`);
                continue;
            }

            console.log(`🔍 Geocoding: ${tank.name}...`);
            const geo = await geocode(tank.name);

            // Fallback near Coimbatore center if geocoding fails
            const lat = geo ? geo.lat : 11.0168 + (Math.random() - 0.5) * 0.05;
            const lon = geo ? geo.lon : 76.9558 + (Math.random() - 0.5) * 0.05;
            const finalAddress = geo ? geo.fullName : tank.address;

            await Resource.create({
                name: tank.name,
                type: 'water_body', // New type for tanks
                address: finalAddress,
                contact: "Managed by Coimbatore Corporation",
                location: {
                    type: 'Point',
                    coordinates: [lon, lat]
                }
            });
            added++;
            console.log(`✅ Added: ${tank.name}`);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n🎉 Done! Added ${added} new water bodies.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
