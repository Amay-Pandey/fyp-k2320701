const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// 1. Correct Imports
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api'); // Make sure this line exists!
const initMatchmaker = require('./socket/matchmaker');

const app = express();

// 2. CORS Configuration
// It is safer to allow your specific frontend URL
app.use(cors({
    origin: "https://courtsync-ebsd.onrender.com",
    credentials: true
}));
app.use(express.json());

// 3. Registered Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', apiRoutes);   // Matches frontend call to /api/users/me
app.use('/api/session', apiRoutes); // Matches frontend call to /api/session/start

const server = http.createServer(app);

// 4. Socket.io Configuration
const io = new Server(server, {
    cors: { 
        origin: "https://courtsync-ebsd.onrender.com", 
        methods: ["GET", "POST"] 
    } 
});

// 5. Database Connection
mongoose.connect(process.env.MONGO_DB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('DB Error:', err));

// Socket Logic
initMatchmaker(io);

// 6. Dynamic Port for Render
// Render sets an environment variable for the port. 3002 will be the fallback for local dev.
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));