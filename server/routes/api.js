const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Ensure this matches your file name exactly
const authMiddleware = require('../middleware/autho'); // Using your 'autho.js' file

// This endpoint allows the Dashboard to fetch the user's ELO and match history
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // req.user.id comes from the logic inside your autho.js middleware
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;