import express from 'express';
const router = express.Router();
import User from '../models/user.js';
import Session from '../models/sessions.js'; 
import authMiddleware from '../middleware/autho.js';
import { startSession, endMatch, endSession, addPlayerToSession, removePlayerFromSession, replaceMatchPlayer } from '../controller/sessionController.js';

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

// 3. GET /api/session/history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const sessions = await Session.find({ adminId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(sessions);
    } catch (err) {
        console.error("SESSION HISTORY Error:", err.message);
        res.status(500).json({ error: "Server error fetching session history" });
    }
});

// 4. GET /api/session/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const session = await Session.findOne({ _id: req.params.id, adminId: req.user.id });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(session);
    } catch (err) {
        console.error("SESSION FETCH Error:", err.message);
        res.status(500).json({ error: "Server error fetching session" });
    }
});

// 5. POST /api/session/start
router.post('/start', authMiddleware, startSession);

// 4. POST /api/session/end
router.post('/end', authMiddleware, endMatch);

// 5. POST /api/session/close
router.post('/close', authMiddleware, endSession);

// 6. POST /api/session/player/add
router.post('/player/add', authMiddleware, addPlayerToSession);

// 7. POST /api/session/player/remove
router.post('/player/remove', authMiddleware, removePlayerFromSession);

// 8. POST /api/session/player/replace
router.post('/player/replace', authMiddleware, replaceMatchPlayer);

export default router;