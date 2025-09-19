const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    busNumber: {
        type: String,
        required: true,
        unique: true
    },
    routeId: {
        type: String,
        required: true
    },
    driverName: {
        type: String,
        required: true
    },
    driverPhone: String,
    capacity: {
        type: Number,
        default: 40
    },
    currentOccupancy: {
        type: Number,
        default: 0
    },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    status: {
        type: String,
        // ✅ FIXED: Added 'idle' to match your seed data
        enum: ['active', 'delayed', 'idle', 'offline', 'maintenance'],
        default: 'offline'
    },
    speed: { type: Number, default: 0 },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Bus', busSchema);