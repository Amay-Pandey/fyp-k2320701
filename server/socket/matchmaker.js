const glicko2 = require('glicko2');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const Session = require('../models/session'); // Your new Session model

module.exports = (io) => {
    const runMatchmaking = async (sessionId) => {
        // 1. Fetch the specific session from DB
        const session = await Session.findById(sessionId);
        if (!session || !session.isActive) return;

        // 2. Identify busy players and courts
        const busyPlayers = session.matches
            .filter(m => m.status === 'ongoing')
            .flatMap(m => [m.player1, m.player2]);

        const busyCourts = session.matches
            .filter(m => m.status === 'ongoing')
            .map(m => m.court);

        // 3. Find available players and courts
        const availablePlayers = session.players.filter(p => !busyPlayers.includes(p.name));
        const allCourts = Array.from({ length: session.numCourts }, (_, i) => i + 1);
        const freeCourt = allCourts.find(c => !busyCourts.includes(c));

        // 4. Logic for Singles (2 players) or Doubles (4 players)
        const playersNeeded = session.isDoubles ? 4 : 2;

        if (availablePlayers.length >= playersNeeded && freeCourt) {
            // Skill-based sort
            availablePlayers.sort((a, b) => a.elo - b.elo);
            
            const matchData = {
                player1: availablePlayers[0].name,
                player2: availablePlayers[1].name,
                court: freeCourt,
                status: 'ongoing',
                matchId: `match_${Date.now()}`
            };

            // 5. Save the match to the Session in DB (Persistence!)
            session.matches.push(matchData);
            await session.save();

            // 6. Tell everyone in the session a match was found
            io.emit(`sessionUpdate_${sessionId}`, session);
        }
    };

    // Trigger this whenever a match ends or a player joins
    io.on('connection', (socket) => {
        socket.on('manualTriggerMatch', ({ sessionId }) => {
            runMatchmaking(sessionId);
        });
    });
};