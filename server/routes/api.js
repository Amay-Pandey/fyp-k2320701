import express from 'express';
import User from '../models/user.js';
import authMiddleware from '../middleware/autho.js';

const router = express.Router();

// Get current user stats
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Start a session
router.post('/start', authMiddleware, async (req, res) => {
    // Logic for your session variables here
    res.json({ msg: "Session started successfully" });
});

export default router; // CRITICAL: This allows 'import apiRoutes' to work