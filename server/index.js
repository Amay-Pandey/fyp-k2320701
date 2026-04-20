import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';

// IMPORT ROUTES (Must include .js extension in ES Modules)
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import initMatchmaker from './socket/matchmaker.js';

const app = express();

app.use(cors({
    origin: "https://courtsync-ebsd.onrender.com",
    credentials: true
}));
app.use(express.json());

// REGISTER ROUTES
// These variables must be functions (the routers), which we'll fix in the next step
app.use('/api/auth', authRoutes);
app.use('/api/users', apiRoutes);
app.use('/api/session', apiRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "https://courtsync-ebsd.onrender.com", methods: ["GET", "POST"] } 
});

mongoose.connect(process.env.MONGO_DB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Error:', err));

initMatchmaker(io);

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));