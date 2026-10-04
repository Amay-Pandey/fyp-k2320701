import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';

const authMiddleware: RequestHandler = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer <token>

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ msg: 'JWT secret is not configured' });
            return;
        }

        const decoded = jwt.verify(token, secret);
        if (typeof decoded === 'string' || typeof decoded.id !== 'string' || typeof decoded.username !== 'string') {
            res.status(401).json({ msg: 'Token is not valid' });
            return;
        }

        req.user = { id: decoded.id, username: decoded.username };
        next();
    } catch {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default authMiddleware; // Fixed export for ES Modules