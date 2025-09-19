const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    routeId: {
        type: String,
        required: true,
        unique: true
    },
    routeName: {
        type: String,
        required: true
    },
    stops: [{
        stopId: String,
        stopName: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        order: Number // sequence in route
    }],
    operatingHours: {
        start: String, // "06:00"
        end: String    // "22:00"
    },
    frequency: Number, // minutes between buses
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Route', routeSchema);