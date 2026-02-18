const mongoose = require('mongoose');

const liveAlertSchema = new mongoose.Schema({
    type: { type: String, enum: ['disaster', 'health', 'sos', 'geofence', 'proactive'], required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    area: { type: String, required: true },
    source: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LiveAlert', liveAlertSchema);
