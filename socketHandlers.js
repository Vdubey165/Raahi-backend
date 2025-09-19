const Bus = require('./models/Bus');

let routeSubscriptions = {}; // { routeId: [socketIds] }

const handleSocketConnection = (socket, io) => {
    console.log('New client connected:', socket.id);

    // Join route tracking
    socket.on('track-route', (routeId) => {
        socket.join(`route-${routeId}`);
        socket.routeId = routeId;
        
        if (!routeSubscriptions[routeId]) {
            routeSubscriptions[routeId] = [];
        }
        routeSubscriptions[routeId].push(socket.id);
    });

    // Bus location update (from driver)
    socket.on('bus-location-update', async (data) => {
        const { busNumber, lat, lng, speed, occupancy } = data;
        
        try {
            const bus = await Bus.findOneAndUpdate(
                { busNumber },
                { 
                    coordinates: { lat, lng },
                    speed,
                    currentOccupancy: occupancy || 0,
                    status: speed > 5 ? 'active' : 'idle',
                    lastUpdated: new Date()
                },
                { new: true }
            );

            if (bus) {
                // Emit to all users tracking this route
                io.to(`route-${bus.routeId}`).emit('buses-updated', {
                    routeId: bus.routeId,
                    buses: [bus]
                });
            }
        } catch (error) {
            console.error('Error updating bus location:', error);
        }
    });

    socket.on('disconnect', () => {
        const routeId = socket.routeId;
        if (routeId && routeSubscriptions[routeId]) {
            routeSubscriptions[routeId] = routeSubscriptions[routeId]
                .filter(id => id !== socket.id);
                
            if (routeSubscriptions[routeId].length === 0) {
                delete routeSubscriptions[routeId];
            }
        }
    });
};

module.exports = { handleSocketConnection };