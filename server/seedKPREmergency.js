/**
 * Seed script — adds emergency services near KPR Institute of Engineering and Technology
 * 
 * Usage: node server/seedKPREmergency.js
 * 
 * Sources: Mappls / Justdial / Practo / Zomato / TN Fire & Rescue
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');

const KPR_SERVICES = [
    // ── Police ──
    {
        name: 'Karumathampatti Police Station',
        type: 'police_station',
        lat: 11.0950,
        lng: 77.1030,
        contact: 'N/A',
        address: 'Karumathampatti, Coimbatore'
    },
    {
        name: 'Arasur Police Station',
        type: 'police_station',
        lat: 11.0972,
        lng: 77.0885,
        contact: '100',
        address: 'Arasur, Coimbatore'
    },
    {
        name: 'DSP Office Karumathampatti',
        type: 'police_station',
        lat: 11.0935,
        lng: 77.1040,
        contact: 'N/A',
        address: 'Somanur Road, Karumathampatti'
    },

    // ── Fire ──
    {
        name: 'Karumathampatti Fire Station',
        type: 'fire_station',
        lat: 11.0968,
        lng: 77.1062,
        contact: '0422-2450101',
        address: 'Karumathampatti / Coimbatore region'
    },
    {
        name: 'Peelamedu Fire Station',
        type: 'fire_station',
        lat: 11.0000,
        lng: 77.0500,
        contact: '101',
        address: 'Peelamedu, Coimbatore'
    },

    // ── Hospitals ──
    {
        name: 'ESI Hospital Karumathampatti',
        type: 'hospital',
        lat: 11.0982,
        lng: 77.1040,
        contact: '108',
        address: 'Karumathampatti'
    },
    {
        name: 'Prema Hospital',
        type: 'hospital',
        lat: 11.1000,
        lng: 77.0940,
        contact: 'N/A',
        address: 'Karumathampatti area'
    },

    // ── Food Points ──
    {
        name: 'Sam Mess',
        type: 'food_point',
        lat: 11.0956,
        lng: 77.1001,
        contact: 'N/A',
        address: 'Karumathampatti'
    },
    {
        name: 'Sri Haries Hotel',
        type: 'food_point',
        lat: 11.0940,
        lng: 77.0980,
        contact: 'N/A',
        address: 'Karumathampatti / Neelambur'
    },
    {
        name: 'Aavin Milk Booth - Karumathampatti',
        type: 'food_point',
        lat: 11.0949,
        lng: 77.1022,
        contact: 'N/A',
        address: 'Near Karumathampatti Bus Stand'
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        let added = 0, skipped = 0, updated = 0;

        for (const svc of KPR_SERVICES) {
            const exists = await Resource.findOne({ name: svc.name });
            if (exists) {
                // Update coordinates if they changed
                const oldCoords = exists.location.coordinates;
                if (oldCoords[0] !== svc.lng || oldCoords[1] !== svc.lat) {
                    exists.location.coordinates = [svc.lng, svc.lat];
                    exists.address = svc.address;
                    exists.contact = svc.contact;
                    await exists.save();
                    updated++;
                    console.log(`🔄 Updated: ${svc.name}`);
                } else {
                    skipped++;
                    console.log(`⏭️  Skipped: ${svc.name} (already exists)`);
                }
            } else {
                await Resource.create({
                    name: svc.name,
                    type: svc.type,
                    address: svc.address,
                    contact: svc.contact,
                    location: {
                        type: 'Point',
                        coordinates: [svc.lng, svc.lat] // GeoJSON: [longitude, latitude]
                    },
                    status: {
                        foodAvailable: svc.type === 'food_point',
                        lastUpdated: new Date()
                    }
                });
                added++;
                console.log(`✅ Added: ${svc.name} (${svc.type})`);
            }
        }

        console.log(`\n🎉 Done! Added ${added}, updated ${updated}, skipped ${skipped}`);
        console.log('📍 Center: KPR Institute of Engineering and Technology (11.0918, 77.0950)');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
