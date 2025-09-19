const express = require('express');
const { 
    getAllBuses, 
    getBusesByRoute, 
    updateBusLocation 
} = require('../controllers/busController');

const { 
    getAllRoutes, 
    getRouteById 
} = require('../controllers/routeController');

// ✅ ADD THIS: Import SMS Service
// // Adjust path if needed

const router = express.Router();

// Bus routes
router.get('/buses', getAllBuses);
router.get('/routes/:routeId/buses', getBusesByRoute);
router.post('/buses/:busId/location', updateBusLocation);

// Route routes
router.get('/routes', getAllRoutes);
router.get('/routes/:routeId', getRouteById);


module.exports = router;