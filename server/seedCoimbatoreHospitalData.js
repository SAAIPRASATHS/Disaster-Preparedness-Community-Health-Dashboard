/**
 * Seed script — adds Coimbatore hospital data with geocoding
 * 
 * Usage: node server/seedCoimbatoreHospitalData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');
const axios = require('axios');

const HOSPITALS = [
    { name: "Coimbatore Medical College Hospital", address: "Trichy Road, Gopalapuram, Coimbatore - 641018", contact: "0422-2301393" },
    { name: "Kovai Medical Center Hospital (KMCH)", address: "Avinashi Road, Coimbatore", contact: "0422-2827784" },
    { name: "P.S.G. Medical College Hospital", address: "Peelamedu, Coimbatore", contact: "0422-2827784" },
    { name: "G Kuppusamy Naidu Hospital", address: "P.N.Palayam, Coimbatore", contact: "0422-2211000" },
    { name: "Ramakrishna Hospital", address: "P.N.Palayam, Coimbatore", contact: "0422-2210075" },
    { name: "K.G. Hospital", address: "Arts College Road, Coimbatore", contact: "0422-2212121" },
    { name: "Aravind Eye Hospital", address: "Avinashi Road, Coimbatore", contact: "0422-4333500" },
    { name: "Sankara Eye Hospital", address: "Sathy Road, Ganapathy, Coimbatore", contact: "0422-2866450" },
    { name: "Ayurveda Hospital", address: "Ramanathapuram, Coimbatore", contact: "0422-2313188" }
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
        for (const hospital of HOSPITALS) {
            const exists = await Resource.findOne({ name: hospital.name });
            if (exists) {
                console.log(`⏭️  Skipped (exists): ${hospital.name}`);
                continue;
            }

            console.log(`🔍 Geocoding: ${hospital.name}...`);
            const geo = await geocode(hospital.name, hospital.address);

            const lat = geo ? geo.lat : 11.0168 + (Math.random() - 0.5) * 0.05;
            const lon = geo ? geo.lon : 76.9558 + (Math.random() - 0.5) * 0.05;
            const finalAddress = geo ? geo.fullName : hospital.address;

            await Resource.create({
                name: hospital.name,
                type: 'hospital',
                address: finalAddress,
                contact: hospital.contact,
                location: {
                    type: 'Point',
                    coordinates: [lon, lat]
                }
            });
            added++;
            console.log(`✅ Added: ${hospital.name} (${hospital.contact})`);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n🎉 Done! Added ${added} new hospitals.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
