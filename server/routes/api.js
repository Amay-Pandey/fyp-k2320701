import express from 'express';
const router = express.Router();
import User from '../models/user.js';
import Session from '../models/sessions.js'; 
import authMiddleware from '../middleware/autho.js';
import { startSession, endMatch, endSession } from '../controller/sessionController.js';

// 1. GET /api/users/me (Matches your frontend request)
// Note: If you mount this at '/api/users' in index.js, this path should be '/' or '/me'
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // Ensure req.user exists from the middleware
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Not authorized, user data missing" });
        }

        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: "User not found" });
        
        res.json(user);
    } catch (err) {
        console.error("ME Error:", err.message);
        res.status(500).json({ error: "Server failed to fetch user profile" });
    }
});

// 2. GET /api/session/active
router.get('/active', authMiddleware, async (req, res) => {
    try {
        let session = await Session.findOne({ adminId: req.user.id, isActive: true })
            .sort({ createdAt: -1 });

        if (!session) {
            session = await Session.findOne({ adminId: req.user.id })
                .sort({ createdAt: -1 });
        }

        res.json(session || null);
    } catch (err) {
        console.error("ACTIVE SESSION Error:", err.message);
        res.status(500).json({ error: "Server error fetching active session" });
    }
});

// 3. POST /api/session/start
router.post('/start', authMiddleware, startSession);

// 4. POST /api/session/end
router.post('/end', authMiddleware, endMatch);

// 5. POST /api/session/close
router.post('/close', authMiddleware, endSession);

export default router;