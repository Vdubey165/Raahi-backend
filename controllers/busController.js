const Bus = require('../models/Bus');
const Route = require('../models/Route');

// Get all active buses
exports.getAllBuses = async (req, res) => {
    try {
        const buses = await Bus.find({ status: { $ne: 'offline' } });
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching buses', error });
    }
};

// Get buses on specific route
exports.getBusesByRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        const buses = await Bus.find({ 
            routeId, 
            status: { $ne: 'offline' } 
        });
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching buses', error });
    }
};

// Update bus location (for drivers)
exports.updateBusLocation = async (req, res) => {
    try {
        const { busId } = req.params;
        const { lat, lng, speed, occupancy } = req.body;
        
        const bus = await Bus.findOneAndUpdate(
            { busNumber: busId },
            { 
                coordinates: { lat, lng },
                speed,
                currentOccupancy: occupancy,
                status: speed > 5 ? 'active' : 'idle',
                lastUpdated: new Date()
            },
            { new: true }
        );
        
        res.json(bus);
    } catch (error) {
        res.status(500).json({ message: 'Error updating bus location', error });
    }
};