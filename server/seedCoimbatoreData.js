/**
 * Seed script — adds Coimbatore police stations with geocoding
 * 
 * Usage: node server/seedCoimbatoreData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');
const axios = require('axios');

const STATIONS = [
    { name: "Bazaar Police Station", contact: "0422-2391000" },
    { name: "Peelamedu Police Station", contact: "0422-2571804" },
    { name: "R.S.Puram Police Station", contact: "0422-2350549" },
    { name: "Ramanathapuram Police Station", contact: "0422-2318195" },
    { name: "Saibaba Colony Police Station", contact: "0422-2437100" },
    { name: "Saravanampatti Police Station", contact: "0422-2666445" },
    { name: "Selvapuram Police Station", contact: "0422-2342477" },
    { name: "Singanallur Police Station", contact: "0422-2573254" },
    { name: "Kattur Police Station", contact: "0422-2302005" },
    { name: "Ukkadam Police Station", contact: "0422-2392838" },
    { name: "Variety Hall Road Police Station", contact: "0422-2397121" },
    { name: "Alandurai Police Station", contact: "0422-2651231" },
    { name: "Anamalai Police Station", contact: "04253-282230" },
    { name: "Annur Police Station", contact: "04254-262239" },
    { name: "Chettypalayam Police Station", contact: "0422-2655228" },
    { name: "Karamadai Police Station", contact: "04254-272444" },
    { name: "Karunyanagar Police Station", contact: "0422-2615701" },
    { name: "Kinathukadavu Police Station", contact: "04259-242040" },
    { name: "Kovilpalayam Police Station", contact: "0422-2654246" },
    { name: "Madukkarai Police Station", contact: "0422-2622222" },
    { name: "Mettupalayam Police Station", contact: "04254-222222" },
    { name: "Periyanaickenpalayam Police Station", contact: "0422-2692228" },
    { name: "Perur Police Station", contact: "0422-2607924" },
    { name: "Podanur Police Station", contact: "0422-2410925" },
    { name: "Pollachi Taluk Police Station", contact: "04259-226733" },
    { name: "Sulur Police Station", contact: "0422-2680100" },
    { name: "Thondamuthur Police Station", contact: "0422-2617258" },
    { name: "Thudiyalur Police Station", contact: "0422-2645090" },
    { name: "Vadavalli Police Station", contact: "0422-2423100" },
    { name: "Valparai Police Station", contact: "04253-222201" },
    { name: "Vadakkipalayam Police Station", contact: "04259-246226" },
    { name: "Pollachi East Police Station", contact: "04259-224433" },
    { name: "Pollachi West Police Station", contact: "04259-224633" }
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
                type: 'police_station',
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

        console.log(`\n🎉 Done! Added ${added} new stations.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
