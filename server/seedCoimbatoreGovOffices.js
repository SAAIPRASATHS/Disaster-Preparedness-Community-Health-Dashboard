/**
 * Seed script — adds Coimbatore government offices with geocoding
 * 
 * Usage: node server/seedCoimbatoreGovOffices.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');
const axios = require('axios');

const OFFICES = [
    { name: "Coimbatore District Collectorate", address: "State Bank Road, Coimbatore - 641018", contact: "0422-2301114" },
    { name: "Coimbatore Corporation Office", address: "Big Bazaar St, Town Hall, Coimbatore - 641001", contact: "0422-2390261" },
    { name: "North Taluk Office", address: "Balasundaram Road, Coimbatore - 641018", contact: "0422-2217831" },
    { name: "South Taluk Office", address: "Huzur Road, Coimbatore - 641018", contact: "0422-2214225" },
    { name: "Revenue Divisional Office", address: "Collectorate Complex, Coimbatore", contact: "0422-2300424" },
    { name: "District Industries Centre", address: "No.2, Raja Street, Coimbatore", contact: "0422-2397311" },
    { name: "Small Industries Service Institute", address: "386, Patel Road, Ram Nagar, Coimbatore", contact: "0422-2230426" },
    { name: "Public Relations Office", address: "Collectorate, Coimbatore", contact: "0422-2301060" }
];

async function geocode(name, address) {
    try {
        const query = `${name}, ${address}, Coimbatore, Tamil Nadu, India`;
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
        for (const office of OFFICES) {
            const exists = await Resource.findOne({ name: office.name });
            if (exists) {
                console.log(`⏭️  Skipped (exists): ${office.name}`);
                continue;
            }

            console.log(`🔍 Geocoding: ${office.name}...`);
            const geo = await geocode(office.name, office.address);

            const lat = geo ? geo.lat : 11.0168 + (Math.random() - 0.5) * 0.05;
            const lon = geo ? geo.lon : 76.9558 + (Math.random() - 0.5) * 0.05;
            const finalAddress = geo ? geo.fullName : office.address;

            await Resource.create({
                name: office.name,
                type: 'government_office',
                address: finalAddress,
                contact: office.contact,
                location: {
                    type: 'Point',
                    coordinates: [lon, lat]
                }
            });
            added++;
            console.log(`✅ Added: ${office.name} (${office.contact})`);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n🎉 Done! Added ${added} new government offices.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
