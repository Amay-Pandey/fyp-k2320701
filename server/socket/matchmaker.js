const glicko2 = require('glicko2');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const ranking = new glicko2.Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 });
let waitingQueue = [];

module.exports = (io) => {
    const findMatches = () => {
        if (waitingQueue.length < 2) return;

        waitingQueue.sort((a, b) => a.joinedAt - b.joinedAt);

        for (let i = 0; i < waitingQueue.length; i++) {
            for (let j = i + 1; j < waitingQueue.length; j++) {
                const p1 = waitingQueue[i];
                const p2 = waitingQueue[j];

                const diff = Math.abs(p1.rating - p2.rating);
                const timeBonus = (Date.now() - p1.joinedAt) / 1000;

                if (diff - timeBonus < 150) {
                    const matchId = `match_${Date.now()}`;
                    const court = Math.floor(Math.random() * 5) + 1;

                    io.to(p1.socketId).emit('matchFound', { 
                        opponentName: p2.username, 
                        opponentId: p2.userId, 
                        court, 
                        matchId 
                    });
                    io.to(p2.socketId).emit('matchFound', { 
                        opponentName: p1.username, 
                        opponentId: p1.userId, 
                        court, 
                        matchId 
                    });

                    waitingQueue = waitingQueue.filter(p => p.socketId !== p1.socketId && p.socketId !== p2.socketId);
                    io.emit('queueUpdate', waitingQueue.length);
                    return;
                }
            }
        }
    };

    setInterval(findMatches, 5000);

    io.on('connection', (socket) => {
        socket.on('joinQueue', async ({ token }) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);
                
                if (!user) return;

                // Remove existing entry for this user if they re-joined
                waitingQueue = waitingQueue.filter(p => p.userId !== user._id.toString());

                waitingQueue.push({
                    socketId: socket.id,
                    userId: user._id.toString(),
                    username: user.username,
                    rating: user.rating,
                    joinedAt: Date.now()
                });

                io.emit('queueUpdate', waitingQueue.length);
            } catch (e) {
                socket.emit('error', 'Authentication failed');
            }
        });

        socket.on('disconnect', () => {
            waitingQueue = waitingQueue.filter(p => p.socketId !== socket.id);
            io.emit('queueUpdate', waitingQueue.length);
        });
    });
};