const mongoose = require('mongoose');
require('dotenv').config();
const SOSAlert = require('./models/SOSAlert');
const User = require('./models/User');

async function seedSOS() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin found, please create one first');
            process.exit(1);
        }

        const alert = await SOSAlert.create({
            userId: admin._id,
            userName: admin.name,
            location: {
                lat: 19.076,
                lng: 72.8777,
                address: 'Test Location, Mumbai'
            },
            message: 'Manual Test SOS Alert',
            resolved: false
        });

        console.log('✅ Created SOS Alert:', alert);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seedSOS();
