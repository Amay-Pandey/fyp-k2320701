const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const initMatchmaker = require('./socket/matchmaker');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "https://courtsync-ebsd.onrender.com", methods: ["GET", "POST"] } 
});

// Database
mongoose.connect(process.env.MONGO_DB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('DB Error:', err));

// Socket Logic
initMatchmaker(io);

const PORT = 3002;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));