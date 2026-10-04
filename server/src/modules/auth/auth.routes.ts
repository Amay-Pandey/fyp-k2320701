import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from 'express';
import User from '../users/user.model.js';

interface RegisterRequest {
    username: string;
    password: string;
    age?: string | number;
    level?: string;
}

interface LoginRequest {
    username: string;
    password: string;
}

interface AuthResponse {
    message?: string;
    error?: string;
    token?: string;
    username?: string;
}

const router = express.Router();
const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unknown error';
const isDuplicateUsername = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

// Register
const register: RequestHandler<Record<string, never>, AuthResponse, RegisterRequest> = async (req, res) => {
    try {
        const { username, password, age, level } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const levelRatingMap: Record<string, number> = {
            'Beginner': 600,
            'Weekly casual': 800,
            'Tier 1/2/3 BE': 2000,
            'Bi-weekly casual': 1000,
            'Occasional tournament player': 1600,
            'ISO medal holder': 1800,
            'Badminton England rated': 1700
        };

        const initialRating = levelRatingMap[level ?? ''] ?? 1500;

        const user = new User({
            username,
            password: hashedPassword,
            age: age ? Number(age) : undefined,
            level: level || 'Beginner',
            rating: initialRating,
            rd: 350,
            vol: 0.06
        });
        await user.save();
        res.status(201).json({ message: "User Created" });
    } catch (error) {
        console.error('REGISTER ERROR:', getErrorMessage(error));
        if (isDuplicateUsername(error)) {
            res.status(409).json({ error: 'Username already exists' });
            return;
        }
        res.status(500).json({ error: 'Could not create account' });
    }
};

router.post('/register', register);

// Login
const login: RequestHandler<Record<string, never>, AuthResponse, LoginRequest> = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                res.status(500).json({ error: 'JWT secret is not configured' });
                return;
            }
            const token = jwt.sign({ id: user._id.toString(), username: user.username }, secret);
            res.json({ token, username: user.username });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (error) {
        console.error('LOGIN ERROR:', getErrorMessage(error));
        res.status(500).json({ error: "Server error" });
    }
};

router.post('/login', login);

export default router;