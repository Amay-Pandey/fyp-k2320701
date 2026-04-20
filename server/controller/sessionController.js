import Session from '../models/sessions.js';
import User from '../models/user.js';
import glicko2 from 'glicko2';

const ranking = new glicko2.Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 });

const selectClosestByRating = (players, basePlayer, sampleSize = 4) => {
    const pool = players.slice(0, Math.min(sampleSize, players.length));
    let bestIndex = 0;
    let bestDiff = Math.abs(pool[0].rating - basePlayer.rating);

    for (let i = 1; i < pool.length; i += 1) {
        const diff = Math.abs(pool[i].rating - basePlayer.rating);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestIndex = i;
        }
    }

    return bestIndex;
};

const buildMatches = (players, numCourts, isDoubles) => {
    const neededPlayers = isDoubles ? 4 : 2;
    const sortedPlayers = [...players].sort((a, b) => {
        const joinedA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const joinedB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        return joinedA - joinedB || a.rating - b.rating;
    });
    const matches = [];
    let court = 1;

    while (sortedPlayers.length >= neededPlayers && court <= numCourts) {
        const matchPlayers = [sortedPlayers.shift()];
        const remaining = sortedPlayers;

        if (isDoubles) {
            if (remaining.length < 3) break;
            const partnerIndex = selectClosestByRating(remaining, matchPlayers[0], 4);
            matchPlayers.push(...remaining.splice(partnerIndex, 1));
            matchPlayers.push(...remaining.splice(0, 2));
        } else {
            if (remaining.length < 1) break;
            const partnerIndex = selectClosestByRating(remaining, matchPlayers[0], 4);
            matchPlayers.push(...remaining.splice(partnerIndex, 1));
        }

        const match = {
            player1: matchPlayers[0].username,
            player2: matchPlayers[1].username,
            court,
            status: 'ongoing',
            startTime: new Date(),
            score: {
                team1: 0,
                team2: 0
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

const createPlayerObject = async (name) => {
    const user = await User.findOne({ username: name });
    return {
        username: name,
        isGuest: !user,
        rating: user ? user.rating : 1500,
        rd: user ? user.rd : 350,
        vol: user ? user.vol : 0.06,
        joinedAt: new Date()
    };
};

const getQueuePlayers = (session) => {
    const ongoing = getOngoingPlayers(session);
    return session.players.filter((player) => !ongoing.includes(player.username));
};

const findMatchField = (match, username) => ['player1', 'player2', 'player3', 'player4'].find((field) => match[field] === username);

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

const getOngoingPlayers = (session) => {
    return session.matches
        .filter((m) => m.status === 'ongoing')
        .flatMap((m) => [m.player1, m.player2, m.player3, m.player4].filter(Boolean));
};

const getFreeCourts = (session) => {
    const busyCourts = session.matches.filter((m) => m.status === 'ongoing').map((m) => m.court);
    return Array.from({ length: session.numCourts }, (_, i) => i + 1).filter((court) => !busyCourts.includes(court));
};

const buildWaitingMatches = (players, freeCourts, isDoubles) => {
    const neededPlayers = isDoubles ? 4 : 2;
    const sortedPlayers = [...players].sort((a, b) => {
        const joinedA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const joinedB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        return joinedA - joinedB || a.rating - b.rating;
    });
    const newMatches = [];
    let courtIndex = 0;

    while (sortedPlayers.length >= neededPlayers && courtIndex < freeCourts.length) {
        const matchPlayers = [sortedPlayers.shift()];
        const remaining = sortedPlayers;

        if (isDoubles) {
            if (remaining.length < 3) break;
            const partnerIndex = selectClosestByRating(remaining, matchPlayers[0], 4);
            matchPlayers.push(...remaining.splice(partnerIndex, 1));
            matchPlayers.push(...remaining.splice(0, 2));
        } else {
            if (remaining.length < 1) break;
            const partnerIndex = selectClosestByRating(remaining, matchPlayers[0], 4);
            matchPlayers.push(...remaining.splice(partnerIndex, 1));
        }

        const match = {
            player1: matchPlayers[0].username,
            player2: matchPlayers[1].username,
            court: freeCourts[courtIndex],
            status: 'ongoing',
            startTime: new Date(),
            score: {
                team1: 0,
                team2: 0
            },
            matchId: `match_${Date.now()}_${freeCourts[courtIndex]}`
        };

        if (isDoubles) {
            match.player3 = matchPlayers[2].username;
            match.player4 = matchPlayers[3].username;
        }

        newMatches.push(match);
        courtIndex += 1;
    }

    return newMatches;
};

export const startSession = async (req, res) => {
    try {
        const { title, numCourts, isDoubles, playerNames } = req.body;
        const nameArray = playerNames.split(',').map((n) => n.trim()).filter(Boolean);

        if (nameArray.length < (isDoubles ? 4 : 2)) {
            return res.status(400).json({ error: `Please enter at least ${isDoubles ? 4 : 2} player names.` });
        }

        await Session.updateMany({ adminId: req.user.id, isActive: true }, { $set: { isActive: false } });

        const playerObjects = await Promise.all(nameArray.map(async (name) => {
            const user = await User.findOne({ username: name });
            return {
                username: name,
                isGuest: !user,
                rating: user ? user.rating : 1500,
                rd: user ? user.rd : 350,
                vol: user ? user.vol : 0.06,
                joinedAt: new Date()
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

        let match = session.matches.find((m) => m.matchId === matchId);

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

        const finishedPlayers = [match.player1, match.player2, match.player3, match.player4].filter(Boolean);
        session.players.forEach((player) => {
            if (finishedPlayers.includes(player.username)) {
                player.joinedAt = new Date();
            }
        });

        const waitingPlayers = session.players.filter((p) => {
            const ongoing = getOngoingPlayers(session);
            return !ongoing.includes(p.username);
        });

        const freeCourts = getFreeCourts(session);
        const newMatches = buildWaitingMatches(waitingPlayers, freeCourts, session.isDoubles);
        if (newMatches.length > 0) {
            session.matches.push(...newMatches);
        }

        const hasOngoing = session.matches.some((m) => m.status === 'ongoing');
        const hasWaitingPlayers = waitingPlayers.length > 0;
        session.isActive = hasOngoing || hasWaitingPlayers;

        await session.save();

        res.json({ message: 'Match ended', session });
    } catch (err) {
        console.error('END MATCH ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

export const addPlayerToSession = async (req, res) => {
    try {
        const { sessionId, username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.adminId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (session.players.some((player) => player.username === username)) {
            return res.status(400).json({ error: 'Player already in session' });
        }

        const newPlayer = await createPlayerObject(username);
        session.players.push(newPlayer);

        const waitingPlayers = getQueuePlayers(session);
        const freeCourts = getFreeCourts(session);
        const newMatches = buildWaitingMatches(waitingPlayers, freeCourts, session.isDoubles);
        if (newMatches.length > 0) {
            session.matches.push(...newMatches);
        }

        const hasOngoing = session.matches.some((m) => m.status === 'ongoing');
        session.isActive = hasOngoing || waitingPlayers.length > 0;

        await session.save();
        res.json({ message: 'Player added', session });
    } catch (err) {
        console.error('ADD PLAYER ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

export const removePlayerFromSession = async (req, res) => {
    try {
        const { sessionId, username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.adminId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (!session.players.some((player) => player.username === username)) {
            return res.status(404).json({ error: 'Player not found in session' });
        }

        session.matches.forEach((match) => {
            ['player1', 'player2', 'player3', 'player4'].forEach((field) => {
                if (match[field] === username) {
                    match[field] = undefined;
                }
            });
        });

        session.players = session.players.filter((player) => player.username !== username);

        const waitingPlayers = getQueuePlayers(session);
        const freeCourts = getFreeCourts(session);
        const newMatches = buildWaitingMatches(waitingPlayers, freeCourts, session.isDoubles);
        if (newMatches.length > 0) {
            session.matches.push(...newMatches);
        }

        const hasOngoing = session.matches.some((m) => m.status === 'ongoing');
        session.isActive = hasOngoing || waitingPlayers.length > 0;

        await session.save();
        res.json({ message: 'Player removed', session });
    } catch (err) {
        console.error('REMOVE PLAYER ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

export const replaceMatchPlayer = async (req, res) => {
    try {
        const { sessionId, matchId, field, replacementUsername } = req.body;
        if (!field || !replacementUsername) {
            return res.status(400).json({ error: 'Both field and replacementUsername are required' });
        }

        const allowedFields = ['player1', 'player2', 'player3', 'player4'];
        if (!allowedFields.includes(field)) {
            return res.status(400).json({ error: 'Invalid match field' });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.adminId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const match = session.matches.find((m) => m.matchId === matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const queuePlayers = getQueuePlayers(session).map((player) => player.username);
        const existingPlayer = session.players.some((player) => player.username === replacementUsername);
        const currentPlayer = match[field];

        if (replacementUsername === currentPlayer) {
            return res.status(400).json({ error: 'Replacement must be a different player' });
        }

        if (!queuePlayers.includes(replacementUsername) && existingPlayer) {
            return res.status(400).json({ error: 'Replacement player must be waiting in the queue or be a new name' });
        }

        if (!queuePlayers.includes(replacementUsername) && !existingPlayer) {
            const newPlayer = await createPlayerObject(replacementUsername);
            session.players.push(newPlayer);
        }

        match[field] = replacementUsername;

        if (currentPlayer) {
            session.players = session.players.filter((player) => player.username !== currentPlayer);
        }

        const waitingPlayers = getQueuePlayers(session);
        const freeCourts = getFreeCourts(session);
        const newMatches = buildWaitingMatches(waitingPlayers, freeCourts, session.isDoubles);
        if (newMatches.length > 0) {
            session.matches.push(...newMatches);
        }

        const hasOngoing = session.matches.some((m) => m.status === 'ongoing');
        session.isActive = hasOngoing || waitingPlayers.length > 0;

        await session.save();
        res.json({ message: 'Player replaced', session });
    } catch (err) {
        console.error('REPLACE PLAYER ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

export const endSession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.adminId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        session.isActive = false;
        session.endedAt = new Date();
        await session.save();

        res.json({ message: 'Session closed', session });
    } catch (err) {
        console.error('END SESSION ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};