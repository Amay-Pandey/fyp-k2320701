import express from 'express';
const router = express.Router();
import User from '../models/user.js';
import Session from '../models/sessions.js'; // Ensure the 's' matches your filename
import authMiddleware from '../middleware/autho.js';

// 1. Fix the 500 Error for /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("ME Error:", err);
        res.status(500).json({ error: "Server failed to fetch user stats" });
    }
});

// 2. Fix the 404 Error for /api/session/active
router.get('/active', authMiddleware, async (req, res) => {
    try {
        // Look for a session that hasn't ended yet
        const activeSession = await Session.findOne({ isActive: true });
        res.json(activeSession || null); // Return null if no session exists
    } catch (err) {
        res.status(500).json({ error: "Server error fetching active session" });
    }
});

// 3. Fix the Initialise Session logic
router.post('/start', authMiddleware, async (req, res) => {
    try {
        const { title, numCourts, isDoubles, playerNames } = req.body;
        
        // Convert comma-separated string to array of names
        const playersArray = playerNames.split(',').map(name => ({
            username: name.trim(),
            rating: 1500 // Default rating
        }));

        const newSession = new Session({
            title,
            numCourts,
            isDoubles,
            players: playersArray,
            isActive: true
        });

        await newSession.save();
        res.status(201).json(newSession);
    } catch (err) {
        console.error("START Error:", err);
        res.status(500).json({ error: "Failed to create session" });
    }
});

export default router;