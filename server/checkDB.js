const mongoose = require('mongoose');
require('dotenv').config();
const SOSAlert = require('./models/SOSAlert');
const SymptomReport = require('./models/SymptomReport');
const Complaint = require('./models/Complaint');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const sosCount = await SOSAlert.countDocuments();
        const reportCount = await SymptomReport.countDocuments();
        const complaintCount = await Complaint.countDocuments();

        console.log('SOS Alerts:', sosCount);
        console.log('Symptom Reports:', reportCount);
        console.log('Complaints:', complaintCount);

        const lastSOS = await SOSAlert.findOne().sort({ timestamp: -1 });
        console.log('Last SOS:', lastSOS);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
