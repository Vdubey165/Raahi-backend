const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas directly in this file to avoid import issues
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
        order: Number
    }],
    operatingHours: {
        start: String,
        end: String
    },
    frequency: Number,
    isActive: {
        type: Boolean,
        default: true
    }
});

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
        enum: ['active', 'delayed', 'idle', 'offline', 'maintenance'], // Added 'idle' here
        default: 'offline'
    },
    speed: { type: Number, default: 0 },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Route = mongoose.model('Route', routeSchema);
const Bus = mongoose.model('Bus', busSchema);

const sampleRoutes = [
    {
        routeId: "R001",
        routeName: "City Center - Airport",
        stops: [
            { stopId: "S001", stopName: "Central Bus Station", coordinates: { lat: 28.6139, lng: 77.2090 }, order: 1 },
            { stopId: "S002", stopName: "Connaught Place", coordinates: { lat: 28.6315, lng: 77.2167 }, order: 2 },
            { stopId: "S003", stopName: "AIIMS Metro", coordinates: { lat: 28.5687, lng: 77.2077 }, order: 3 },
            { stopId: "S004", stopName: "IGI Airport Terminal 1", coordinates: { lat: 28.5665, lng: 77.1031 }, order: 4 }
        ],
        operatingHours: { start: "05:00", end: "23:00" },
        frequency: 15,
        isActive: true
    },
    {
        routeId: "R002", 
        routeName: "University Route",
        stops: [
            { stopId: "S101", stopName: "Delhi University", coordinates: { lat: 28.6967, lng: 77.2094 }, order: 1 },
            { stopId: "S102", stopName: "Kamla Nagar", coordinates: { lat: 28.6758, lng: 77.2109 }, order: 2 },
            { stopId: "S103", stopName: "Civil Lines", coordinates: { lat: 28.6769, lng: 77.2224 }, order: 3 },
            { stopId: "S104", stopName: "Red Fort", coordinates: { lat: 28.6562, lng: 77.2410 }, order: 4 }
        ],
        operatingHours: { start: "06:00", end: "22:00" },
        frequency: 20,
        isActive: true
    }
];

const sampleBuses = [
    {
        busNumber: "DL-1234",
        routeId: "R001",
        driverName: "Rajesh Kumar",
        driverPhone: "+91-9876543210",
        capacity: 40,
        currentOccupancy: 15,
        coordinates: { lat: 28.6139, lng: 77.2090 },
        status: "active",
        speed: 25
    },
    {
        busNumber: "DL-5678",
        routeId: "R001", 
        driverName: "Suresh Singh",
        driverPhone: "+91-9876543211",
        capacity: 45,
        currentOccupancy: 32,
        coordinates: { lat: 28.6315, lng: 77.2167 },
        status: "active",
        speed: 18
    },
    {
        busNumber: "DL-9012",
        routeId: "R002",
        driverName: "Amit Sharma",
        driverPhone: "+91-9876543212", 
        capacity: 35,
        currentOccupancy: 8,
        coordinates: { lat: 28.6967, lng: 77.2094 },
        status: "idle",
        speed: 0
    }
];

const seedDatabase = async () => {
    try {
        // Connect with proper options to avoid deprecation warnings
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await Route.deleteMany({});
        await Bus.deleteMany({});
        console.log('Cleared existing data');

        // Insert sample data
        await Route.insertMany(sampleRoutes);
        await Bus.insertMany(sampleBuses);
        
        console.log('Sample data inserted successfully!');
        console.log(`Inserted ${sampleRoutes.length} routes and ${sampleBuses.length} buses`);
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();