import express from 'express';
const router = express.Router();
import User from '../models/user.js';
import Session from '../models/sessions.js'; 
import authMiddleware from '../middleware/autho.js';
import { startSession, endMatch, endSession, addPlayerToSession, removePlayerFromSession, replaceMatchPlayer } from '../controller/sessionController.js';

router.get('/me', authMiddleware, async (req, res) => {
    try {
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

// Leaderboard: where egos go to die
router.get('/leaderboard', authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id).select('username rating matchHistory');
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const sessions = await Session.find({
            $or: [
                { adminId: req.user.id },
                { 'players.username': currentUser.username }
            ]
        }).lean();

        const sharedUsernames = new Set();
        const adminIds = new Set();

        sessions.forEach((session) => {
            session.players.forEach((player) => {
                if (player.username && player.username !== currentUser.username) {
                    sharedUsernames.add(player.username);
                }
            });
            if (session.adminId && session.adminId.toString() !== req.user.id) {
                adminIds.add(session.adminId.toString());
            }
        });

        if (adminIds.size > 0) {
            const admins = await User.find({ _id: { $in: Array.from(adminIds) } }).select('username');
            admins.forEach((admin) => sharedUsernames.add(admin.username));
        }

        const usernames = Array.from(sharedUsernames);
        const leaderboardUsers = await User.find({ username: { $in: [...usernames, currentUser.username] } })
            .select('username rating matchHistory')
            .lean();

        const buildAchievements = (games, winRate) => {
            const tags = [];
            if (games >= 10) tags.push('10 Games');
            if (winRate >= 75) tags.push('Hot Streak');
            else if (winRate >= 60) tags.push('Consistent');
            if (!tags.length) tags.push('Rising Star');
            return tags;
        };

        const rows = leaderboardUsers.map((user) => {
            const games = (user.matchHistory || []).length;
            const wins = (user.matchHistory || []).filter((match) => match.isWin).length;
            const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
            return {
                player: user.username,
                rating: user.rating || 1500,
                games,
                wins,
                winRate,
                achievements: buildAchievements(games, winRate)
            };
        });

        rows.sort((a, b) => b.rating - a.rating || a.player.localeCompare(b.player));
        const ranked = rows.map((row, index) => ({ rank: index + 1, ...row }));

        res.json(ranked);
    } catch (err) {
        console.error('LEADERBOARD ERROR:', err);
        res.status(500).json({ error: 'Server error fetching leaderboard' });
    }
});

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

router.post('/start', authMiddleware, startSession);

router.post('/end', authMiddleware, endMatch);

router.post('/close', authMiddleware, endSession);

router.post('/player/add', authMiddleware, addPlayerToSession);

router.post('/player/remove', authMiddleware, removePlayerFromSession);

router.post('/player/replace', authMiddleware, replaceMatchPlayer);

export default router;