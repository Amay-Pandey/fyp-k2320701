import Session from '../models/sessions.js';
import User from '../models/user.js';
import glicko2 from 'glicko2';

const ranking = new glicko2.Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 });

const buildMatches = (players, numCourts, isDoubles) => {
    const neededPlayers = isDoubles ? 4 : 2;
    const sortedPlayers = [...players].sort((a, b) => a.rating - b.rating);
    const matches = [];
    let court = 1;

    while (sortedPlayers.length >= neededPlayers && court <= numCourts) {
        const matchPlayers = sortedPlayers.splice(0, neededPlayers);
        const match = {
            player1: matchPlayers[0].username,
            player2: matchPlayers[1].username,
            court,
            status: 'ongoing',
            startTime: new Date(),
            score: {
                player1: 0,
                player2: 0,
                player3: 0,
                player4: 0
            },
            matchId: `match_${Date.now()}_${court}`
        };

        if (isDoubles) {
            match.player3 = matchPlayers[2].username;
            match.player4 = matchPlayers[3].username;
        }

        matches.push(match);
        court += 1;
    }

    return matches;
};

const findSessionPlayer = (session, username) => session.players.find((player) => player.username === username);

const getTeamStats = (players) => {
    const count = players.length;
    return {
        rating: players.reduce((sum, p) => sum + p.rating, 0) / count,
        rd: players.reduce((sum, p) => sum + p.rd, 0) / count,
        vol: players.reduce((sum, p) => sum + p.vol, 0) / count
    };
};

const applyRatingDelta = async (playerRecord, delta, opponentNames, match) => {
    const isGuest = !playerRecord.user;
    const destination = playerRecord.user || findSessionPlayer(playerRecord.session, playerRecord.username);

    if (!destination) return;

    const beforeRating = destination.rating;
    const newRating = Math.round(beforeRating + delta);

    if (playerRecord.user) {
        destination.matchHistory.push({
            opponent: opponentNames.join(' & '),
            isWin: playerRecord.isWinner,
            eloBefore: beforeRating,
            eloAfter: newRating,
            matchDate: new Date()
        });
        destination.rating = newRating;
        destination.rd = playerRecord.newRd;
        destination.vol = playerRecord.newVol;
        await destination.save();
    } else {
        destination.rating = newRating;
        destination.rd = playerRecord.newRd;
        destination.vol = playerRecord.newVol;
    }
};

export const startSession = async (req, res) => {
    try {
        const { title, numCourts, isDoubles, playerNames } = req.body;
        const nameArray = playerNames.split(',').map((n) => n.trim()).filter(Boolean);

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

        const matches = buildMatches(playerObjects, numCourts, isDoubles);

        const newSession = new Session({
            title,
            numCourts,
            isDoubles,
            adminId: req.user.id,
            players: playerObjects,
            matches,
            isActive: matches.length > 0
        });

        await newSession.save();
        res.status(201).json(newSession);
    } catch (err) {
        console.error('START SESSION ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

export const endMatch = async (req, res) => {
    try {
        const { sessionId, matchId, winnerName, winnerTeam, score } = req.body;
        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        let match = session.matches.id(matchId);
        if (!match) {
            match = session.matches.find((m) => m.matchId === matchId);
        }

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        if (match.status === 'finished') {
            return res.status(400).json({ error: 'Match already ended' });
        }

        const winnerNames = match.player3 && match.player4
            ? (winnerTeam === 'team2' ? [match.player3, match.player4] : [match.player1, match.player2])
            : [winnerName];
        const loserNames = match.player3 && match.player4
            ? (winnerTeam === 'team2' ? [match.player1, match.player2] : [match.player3, match.player4])
            : (winnerName === match.player1 ? [match.player2] : [match.player1]);

        const winnerPlayers = await Promise.all(winnerNames.map(async (username) => {
            const user = await User.findOne({ username });
            const sessionPlayer = findSessionPlayer(session, username);
            return {
                username,
                isGuest: !user,
                user,
                session,
                rating: user ? user.rating : sessionPlayer?.rating ?? 1500,
                rd: user ? user.rd : sessionPlayer?.rd ?? 350,
                vol: user ? user.vol : sessionPlayer?.vol ?? 0.06,
                isWinner: true
            };
        }));

        const loserPlayers = await Promise.all(loserNames.map(async (username) => {
            const user = await User.findOne({ username });
            const sessionPlayer = findSessionPlayer(session, username);
            return {
                username,
                isGuest: !user,
                user,
                session,
                rating: user ? user.rating : sessionPlayer?.rating ?? 1500,
                rd: user ? user.rd : sessionPlayer?.rd ?? 350,
                vol: user ? user.vol : sessionPlayer?.vol ?? 0.06,
                isWinner: false
            };
        }));

        const winnerStats = getTeamStats(winnerPlayers);
        const loserStats = getTeamStats(loserPlayers);

        const winnerGlicko = ranking.makePlayer(winnerStats.rating, winnerStats.rd, winnerStats.vol);
        const loserGlicko = ranking.makePlayer(loserStats.rating, loserStats.rd, loserStats.vol);
        ranking.updateRatings([[winnerGlicko, loserGlicko, 1]]);

        const winnerDelta = winnerGlicko.getRating() - winnerStats.rating;
        const loserDelta = loserGlicko.getRating() - loserStats.rating;

        for (const winner of winnerPlayers) {
            winner.newRd = winnerGlicko.getRd();
            winner.newVol = winnerGlicko.getVol();
            await applyRatingDelta(winner, winnerDelta, loserNames, match);
        }
        for (const loser of loserPlayers) {
            loser.newRd = loserGlicko.getRd();
            loser.newVol = loserGlicko.getVol();
            await applyRatingDelta(loser, loserDelta, winnerNames, match);
        }

        match.status = 'finished';
        match.winner = winnerNames.join(' & ');
        match.winnerTeam = match.player3 && match.player4 ? winnerTeam : winnerName;
        if (score) {
            match.score = { ...match.score, ...score };
        }

        const hasOngoing = session.matches.some((m) => m.status === 'ongoing');
        session.isActive = hasOngoing;

        await session.save();

        res.json({ message: 'Match ended', session });
    } catch (err) {
        console.error('END MATCH ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};