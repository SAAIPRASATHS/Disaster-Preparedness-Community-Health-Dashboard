/**
 * Seed script — adds emergency resources for Tamil Nadu (Coimbatore / Pollachi area)
 * 
 * Usage:  node seedResources.js
 * 
 * It will NOT duplicate entries — it checks by name before inserting.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');

const resources = [
    // ── Fire Stations ──
    {
        name: 'Coimbatore City Fire Station',
        type: 'fire_station',
        location: { type: 'Point', coordinates: [76.9558, 11.0168] },
        address: 'Big Bazaar Street, Town Hall, Coimbatore',
        contact: '0422-2394101',
    },
    {
        name: 'Pollachi Fire Station',
        type: 'fire_station',
        location: { type: 'Point', coordinates: [77.0083, 10.6589] },
        address: 'Pollachi Main Road, Pollachi, Tamil Nadu',
        contact: '04259-223101',
    },
    {
        name: 'Tirupur Fire Station',
        type: 'fire_station',
        location: { type: 'Point', coordinates: [77.3411, 11.1085] },
        address: 'Palladam Road, Tirupur, Tamil Nadu',
        contact: '0421-2200101',
    },

    // ── Police Stations ──
    {
        name: 'Coimbatore Town Police Station',
        type: 'police_station',
        location: { type: 'Point', coordinates: [76.9610, 11.0012] },
        address: 'Oppanakara Street, Town Hall, Coimbatore',
        contact: '0422-2396100',
    },
    {
        name: 'Pollachi Town Police Station',
        type: 'police_station',
        location: { type: 'Point', coordinates: [77.0070, 10.6600] },
        address: 'Near Bus Stand, Pollachi, Tamil Nadu',
        contact: '04259-222100',
    },
    {
        name: 'RS Puram Police Station',
        type: 'police_station',
        location: { type: 'Point', coordinates: [76.9480, 11.0094] },
        address: 'D.B. Road, RS Puram, Coimbatore',
        contact: '0422-2542100',
    },
    {
        name: 'Saravanampatti Police Station',
        type: 'police_station',
        location: { type: 'Point', coordinates: [77.0120, 11.0690] },
        address: 'Sathy Road, Saravanampatti, Coimbatore',
        contact: '0422-2670100',
    },

    // ── Hotels / Emergency Shelters ──
    {
        name: 'Hotel Sri Murugan - Coimbatore',
        type: 'hotel',
        location: { type: 'Point', coordinates: [76.9617, 11.0018] },
        address: 'Sathy Road, Gandhipuram, Coimbatore',
        contact: '0422-2499888',
    },
    {
        name: 'Hotel Annapoorna - Coimbatore',
        type: 'hotel',
        location: { type: 'Point', coordinates: [76.9550, 11.0040] },
        address: 'East Arokiasamy Road, RS Puram, Coimbatore',
        contact: '0422-2541212',
    },
    {
        name: 'Pollachi Rest House',
        type: 'hotel',
        location: { type: 'Point', coordinates: [77.0095, 10.6575] },
        address: 'Near Pollachi Bus Stand, Tamil Nadu',
        contact: '04259-225500',
    },

    // ── Food Points / Community Kitchens ──
    {
        name: 'Amma Unavagam - Gandhipuram',
        type: 'food_point',
        location: { type: 'Point', coordinates: [76.9730, 11.0170] },
        address: 'Gandhipuram Bus Stand, Coimbatore',
        contact: '0422-2222000',
        status: { foodAvailable: true, lastUpdated: new Date() },
    },
    {
        name: 'Amma Unavagam - RS Puram',
        type: 'food_point',
        location: { type: 'Point', coordinates: [76.9490, 11.0085] },
        address: 'D.B. Road, RS Puram, Coimbatore',
        contact: '0422-2222001',
        status: { foodAvailable: true, lastUpdated: new Date() },
    },
    {
        name: 'Community Kitchen - Pollachi',
        type: 'food_point',
        location: { type: 'Point', coordinates: [77.0050, 10.6610] },
        address: 'Market Road, Pollachi, Tamil Nadu',
        contact: '04259-226000',
        status: { foodAvailable: true, lastUpdated: new Date() },
    },
    {
        name: 'Amma Unavagam - Ukkadam',
        type: 'food_point',
        location: { type: 'Point', coordinates: [76.9600, 10.9890] },
        address: 'Ukkadam Bus Stand, Coimbatore',
        contact: '0422-2222002',
        status: { foodAvailable: true, lastUpdated: new Date() },
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        let added = 0, skipped = 0;
        for (const r of resources) {
            const exists = await Resource.findOne({ name: r.name });
            if (exists) {
                skipped++;
                console.log(`⏭️  Skipped (already exists): ${r.name}`);
            } else {
                await Resource.create(r);
                added++;
                console.log(`✅ Added: ${r.name}`);
            }
        }

        console.log(`\n🎉 Done! Added ${added}, skipped ${skipped} (already existed)`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
}

seed();
