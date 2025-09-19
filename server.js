require('dotenv').config(); // Only once, at the very top

const express = require('express');
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io');
const mongoose = require('mongoose');
const busRoutes = require('./routes/busRoutes');
const { handleSocketConnection } = require('./socketHandlers');

// Import SMS service routes
const { router: smsRoutes } = require('./smsService');

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Mount routes
app.use('/api', busRoutes);
app.use('/api/sms', smsRoutes); // Add this line for SMS routes

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');
    handleSocketConnection(socket, io);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`SMS endpoints available at: http://localhost:${PORT}/api/sms/`);
});