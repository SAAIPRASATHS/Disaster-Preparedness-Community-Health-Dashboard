require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const { verifyToken, verifyAdmin } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const riskRoutes = require('./routes/risk');
const preparednessRoutes = require('./routes/preparedness');
const reportRoutes = require('./routes/report');
const clusterRoutes = require('./routes/cluster');
const complaintRoutes = require('./routes/complaint');
const sosRoutes = require('./routes/sos');
const liveAlertRoutes = require('./routes/liveAlert');

const app = express();
const server = http.createServer(app);

// ── Socket.IO ──
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
});
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('geofence-breach', (data) => {
        console.log(`⚠️ Geofence breach from ${socket.id}:`, data);
        io.emit('geofence-alert', data);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// ── Middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/preparedness', preparednessRoutes);
app.use('/api/report', verifyToken, reportRoutes);
app.use('/api/cluster', verifyToken, verifyAdmin, clusterRoutes);
app.use('/api/complaint', verifyToken, complaintRoutes);
app.use('/api/sos', verifyToken, sosRoutes);
app.use('/api/live-alert', liveAlertRoutes);

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'Disaster Preparedness API', websocket: true });
});

// ── Database & Server ──
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set in .env');
    process.exit(1);
}

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('✅  MongoDB connected');
        server.listen(PORT, () => console.log(`🚀  Server running on port ${PORT} (with Socket.IO)`));
    })
    .catch((err) => {
        console.error('❌  MongoDB connection failed:', err.message);
        process.exit(1);
    });
