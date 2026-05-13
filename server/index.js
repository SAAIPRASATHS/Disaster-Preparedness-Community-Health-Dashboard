require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const db = require('./db');

const { verifyToken, verifyAdmin } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const riskRoutes = require('./routes/risk');
const preparednessRoutes = require('./routes/preparedness');
const reportRoutes = require('./routes/report');
const clusterRoutes = require('./routes/cluster');
const complaintRoutes = require('./routes/complaint');
const sosRoutes = require('./routes/sos');
const liveAlertRoutes = require('./routes/liveAlert');
const chatRoutes = require('./routes/chat');
const weatherRoutes = require('./routes/weather');
const airqualityRoutes = require('./routes/airquality');
const pollenRoutes = require('./routes/pollen');
const resourceRoutes = require('./routes/resources');

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
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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
app.use('/api/chat', chatRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/airquality', airqualityRoutes);
app.use('/api/pollen', pollenRoutes);
app.use('/api/resources', resourceRoutes);


// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'Disaster Preparedness API', database: 'neon-postgresql', websocket: true });
});

// ── Database & Server ──
const PORT = process.env.PORT || 5000;

async function start() {
    try {
        // Initialise PostgreSQL schema (creates tables if not exist)
        await db.initDb();

        // Quick connection test
        const result = await db.query('SELECT NOW()');
        console.log('✅ PostgreSQL connected at:', result.rows[0].now);

        server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (with Socket.IO)`));
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
}

start();
