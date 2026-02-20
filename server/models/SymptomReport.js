const mongoose = require('mongoose');

const symptomReportSchema = new mongoose.Schema({
    location: { type: String, required: true, trim: true, lowercase: true },
    symptoms: {
        type: [String],
        required: true,
        enum: ['fever', 'cough', 'vomiting', 'diarrhea', 'rash', 'breathing_issue'],
        validate: {
            validator: (arr) => arr.length > 0,
            message: 'At least one symptom is required',
        },
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: 'Citizen' },
    createdAt: { type: Date, default: Date.now, index: true },
});

// TTL index — auto-delete reports older than 7 days to keep DB lean
symptomReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('SymptomReport', symptomReportSchema);
