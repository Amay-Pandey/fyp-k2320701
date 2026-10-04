import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './modules/auth/auth.routes.js';
import apiRoutes from './modules/sessions/session.routes.js';
import dns from 'node:dns';

// Force Node.js to use Google DNS



const app = express();

app.use(cors({
    origin: "https://courtsync-ebsd.onrender.com",
    credentials: true
}));
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/api/auth', authRoutes);
app.use('/api/users', apiRoutes);
app.use('/api/session', apiRoutes);

const buildPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(buildPath));

app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(buildPath, 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Unable to load app');
        }
    });
});

dns.setServers(['8.8.8.8', '8.8.4.4']);


const server = http.createServer(app);
const mongoUri = process.env.MONGO_DB_URI;
if (!mongoUri) {
    throw new Error('MONGO_DB_URI is not configured');
}

mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Error:', err));

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));