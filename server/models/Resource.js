const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['fire_station', 'police_station', 'hotel', 'food_point', 'hospital', 'government_office', 'water_body', 'rescue_center'],
        required: true
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    address: String,
    contact: String,
    status: {
        foodAvailable: { type: Boolean, default: true },
        lastUpdated: { type: Date, default: Date.now }
    },
    createdAt: { type: Date, default: Date.now }
});

// Create index for geo-spatial queries
resourceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Resource', resourceSchema);
