import express from 'express';
const router = express.Router();
import User from '../models/user.js';
import authMiddleware from '../middleware/autho.js'; // Ensure the .js extension

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Add your session start route here too
router.post('/session/start', authMiddleware, async (req, res) => {
    // Logic for starting session
    res.json({ msg: "Session started" });
});

export default router;