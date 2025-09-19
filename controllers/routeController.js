const Route = require('../models/Route');

// Get all routes
exports.getAllRoutes = async (req, res) => {
    try {
        const routes = await Route.find({ isActive: true });
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching routes', error });
    }
};

// Get specific route with stops
exports.getRouteById = async (req, res) => {
    try {
        const { routeId } = req.params;
        const route = await Route.findOne({ routeId, isActive: true });
        res.json(route);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching route', error });
    }
};