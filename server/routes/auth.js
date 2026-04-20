import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "User Created" });
    } catch (e) {
        res.status(400).json({ error: "Username already exists" });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
            res.json({ token, username: user.username });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

export default router;