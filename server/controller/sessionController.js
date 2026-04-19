const Session = require('../models/session');
const User = require('../models/user');
const glicko2 = require('glicko2');

const ranking = new glicko2.Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 });

exports.startSession = async (req, res) => {
    try {
        const { title, numCourts, isDoubles, playerNames } = req.body;
        const nameArray = playerNames.split(',').map(n => n.trim());

        const playerObjects = await Promise.all(nameArray.map(async (name) => {
            const user = await User.findOne({ username: name });
            return {
                username: name,
                isGuest: !user,
                rating: user ? user.rating : 1500,
                rd: user ? user.rd : 350,
                vol: user ? user.vol : 0.06
            };
        }));

        const newSession = new Session({
            title,
            numCourts,
            isDoubles,
            adminId: req.user.id,
            players: playerObjects,
            isActive: true
        });

        await newSession.save();
        res.status(201).json(newSession);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.endMatch = async (req, res) => {
    try {
        const { sessionId, matchId, winnerName } = req.body;
        const session = await Session.findById(sessionId);
        const match = session.matches.id(matchId);

        if (match.status === 'finished') return res.status(400).json({ error: "Match already ended" });

        // Identify Player 1 and Player 2
        const p1User = await User.findOne({ username: match.player1 });
        const p2User = await User.findOne({ username: match.player2 });

        if (p1User && p2User) {
            // Create Glicko objects for both
            const player1 = ranking.makePlayer(p1User.rating, p1User.rd, p1User.vol);
            const player2 = ranking.makePlayer(p2User.rating, p2User.rd, p2User.vol);

            // Calculate new ratings (1 = p1 win, 0 = p2 win)
            const result = winnerName === match.player1 ? 1 : 0;
            ranking.updateRatings([[player1, player2, result]]);

            // Update Player 1 in DB
            p1User.matchHistory.push({
                opponent: p2User.username,
                isWin: winnerName === p1User.username,
                eloBefore: p1User.rating,
                eloAfter: player1.getRating()
            });
            p1User.rating = player1.getRating();
            p1User.rd = player1.getRd();
            p1User.vol = player1.getVol();
            await p1User.save();

            // Update Player 2 in DB
            p2User.matchHistory.push({
                opponent: p1User.username,
                isWin: winnerName === p2User.username,
                eloBefore: p2User.rating,
                eloAfter: player2.getRating()
            });
            p2User.rating = player2.getRating();
            p2User.rd = player2.getRd();
            p2User.vol = player2.getVol();
            await p2User.save();
        }

        match.status = 'finished';
        await session.save();
        res.json({ message: "Ratings updated successfully", session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};