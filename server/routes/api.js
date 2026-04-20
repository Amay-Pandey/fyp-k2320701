const express = require('express');
const router = express.Router();
const User = require('../models/user');
import authMiddleware from '../middleware/autho.js';

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// POST /api/session/start
router.post('/start', authMiddleware, async (req, res) => {
   // your session start logic here
   res.json({ message: "Session started" });
});

module.exports = router;