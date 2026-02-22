require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const all = await Resource.find({});
    console.log('Total resources in DB:', all.length);

    const types = {};
    all.forEach(r => {
        types[r.type] = (types[r.type] || 0) + 1;
    });
    console.log('\nBy type:');
    Object.entries(types).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

    // KPR area specifically
    const kpr = all.filter(r => {
        const lat = r.location.coordinates[1];
        const lng = r.location.coordinates[0];
        return lat >= 10.99 && lat <= 11.12 && lng >= 77.04 && lng <= 77.11;
    });
    console.log('\nKPR area resources:', kpr.length);
    kpr.forEach(r => console.log(`  [${r.type}] ${r.name}`));

    process.exit(0);
});
