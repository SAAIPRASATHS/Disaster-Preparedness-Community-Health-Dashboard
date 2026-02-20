/**
 * Seed script — adds police stations from CSV file
 * 
 * Usage: node server/seedPoliceStations.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Resource = require('./models/Resource');

// Simple CSV parser that handles quoted strings
function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const csvPath = path.join(__dirname, '..', 'D59. Police Stations_0.csv');
        if (!fs.existsSync(csvPath)) {
            console.error(`❌ CSV file not found at ${csvPath}`);
            process.exit(1);
        }

        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        const header = parseCSVLine(lines[0]);

        console.log(`Parsing ${lines.length - 1} police stations...`);

        let added = 0, skipped = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            if (row.length < 5) continue;

            const name = row[1];
            const address = row[2];
            // Based on data analysis, column index 3 contains Latitude (~10.7) and index 4 contains Longitude (~78.7)
            // even though the header might be swapped or misleading.
            const lat = parseFloat(row[3]);
            const lng = parseFloat(row[4]);

            if (isNaN(lat) || isNaN(lng)) {
                console.log(`⚠️  Skipping ${name}: Invalid coordinates (${row[3]}, ${row[4]})`);
                continue;
            }

            const exists = await Resource.findOne({ name });
            if (exists) {
                skipped++;
                // console.log(`⏭️  Skipped: ${name}`);
            } else {
                await Resource.create({
                    name,
                    type: 'police_station',
                    address,
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat] // [longitude, latitude]
                    },
                    contact: '', // Not in CSV
                });
                added++;
                console.log(`✅ Added: ${name}`);
            }
        }

        console.log(`\n🎉 Done! Added ${added}, skipped ${skipped} (already existed)`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();
