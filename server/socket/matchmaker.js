import glicko2 from 'glicko2';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Session from '../models/sessions.js'; // Your new Session model

export default (io) => {
    // Matchmaking: like Tinder but for badminton
    const runMatchmaking = async (sessionId) => {
        const session = await Session.findById(sessionId);
        if (!session || !session.isActive) return;

        const busyPlayers = session.matches
            .filter(m => m.status === 'ongoing')
            .flatMap(m => [m.player1, m.player2]);

        const busyCourts = session.matches
            .filter(m => m.status === 'ongoing')
            .map(m => m.court);

        const availablePlayers = session.players.filter(p => !busyPlayers.includes(p.name));
        const allCourts = Array.from({ length: session.numCourts }, (_, i) => i + 1);
        const freeCourt = allCourts.find(c => !busyCourts.includes(c));

        const playersNeeded = session.isDoubles ? 4 : 2;

        if (availablePlayers.length >= playersNeeded && freeCourt) {
            availablePlayers.sort((a, b) => a.elo - b.elo);
            
            const matchData = {
                player1: availablePlayers[0].name,
                player2: availablePlayers[1].name,
                court: freeCourt,
                status: 'ongoing',
                matchId: `match_${Date.now()}`
            };

            session.matches.push(matchData);
            await session.save();

            io.emit(`sessionUpdate_${sessionId}`, session);
        }
    };

    io.on('connection', (socket) => {
        socket.on('manualTriggerMatch', ({ sessionId }) => {
            runMatchmaking(sessionId);
        });
    });
};