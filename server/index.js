const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const glicko2 = require('glicko2');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

const settings = { tau: 0.5, rating: 1500, rd: 350, vol: 0.06 };
const ranking = new glicko2.Glicko2(settings);

let activeMatches = {}; 
let waitingQueue = [];
let playerStats = {}; 

const findMatches = () => {
    if (waitingQueue.length < 2) return;
    
    waitingQueue.sort((a, b) => a.joinedAt - b.joinedAt);
    let matchedIndices = new Set();

    for (let i = 0; i < waitingQueue.length; i++) {
        if (matchedIndices.has(i)) continue;
        for (let j = i + 1; j < waitingQueue.length; j++) {
            if (matchedIndices.has(j)) continue;

            const p1 = waitingQueue[i];
            const p2 = waitingQueue[j];

            // Formula: Skill difference minus a "patience bonus"
            if (Math.abs(p1.rating - p2.rating) - ((Date.now() - p1.joinedAt)/500) < 150) {
                const matchId = `match_${Date.now()}_${p1.id.substring(0,3)}`;
                const court = Math.floor(Math.random() * 5) + 1;

                activeMatches[matchId] = { p1: p1.id, p2: p2.id, status: 'active' };

                io.to(p1.id).emit('matchFound', { opponentName: p2.name, opponentId: p2.id, court, matchId });
                io.to(p2.id).emit('matchFound', { opponentName: p1.name, opponentId: p1.id, court, matchId });

                matchedIndices.add(i);
                matchedIndices.add(j);
                break;
            }
        }
    }
    waitingQueue = waitingQueue.filter((_, index) => !matchedIndices.has(index));
    io.emit('queueUpdate', waitingQueue.length);
};

setInterval(findMatches, 5000);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- RE-ADDED THIS SECTION ---
    socket.on('joinQueue', (data) => {
        // Initialize stats if they don't exist
        if (!playerStats[socket.id]) {
            playerStats[socket.id] = { 
                rating: 1500, rd: 350, vol: 0.06, 
                name: data.name || `Player ${socket.id.substring(0,3)}` 
            };
        }

        const newPlayer = {
            id: socket.id,
            name: playerStats[socket.id].name,
            rating: playerStats[socket.id].rating,
            rd: playerStats[socket.id].rd,
            vol: playerStats[socket.id].vol,
            joinedAt: Date.now()
        };
        
        if (!waitingQueue.find(p => p.id === socket.id)) {
            waitingQueue.push(newPlayer);
        }
        io.emit('queueUpdate', waitingQueue.length);
    });
    // -----------------------------

    socket.on('matchResult', ({ matchId, winnerId, loserId }) => {
        const match = activeMatches[matchId];

        if (match && match.status === 'active') {
            match.status = 'finished'; 

            const wData = playerStats[winnerId] || { rating: 1500, rd: 350, vol: 0.06 };
            const lData = playerStats[loserId] || { rating: 1500, rd: 350, vol: 0.06 };

            const winner = ranking.makePlayer(wData.rating, wData.rd, wData.vol);
            const loser = ranking.makePlayer(lData.rating, lData.rd, lData.vol);
            ranking.updateRatings([[winner, loser, 1]]);

            // Update stats
            playerStats[winnerId] = { ...wData, rating: winner.getRating(), rd: winner.getRd() };
            playerStats[loserId] = { ...lData, rating: loser.getRating(), rd: loser.getRd() };

            console.log(`Elo Update: ${playerStats[winnerId].name} (${winner.getRating().toFixed(0)}) beat ${playerStats[loserId].name} (${loser.getRating().toFixed(0)})`);

            io.to(match.p1).emit('matchFinished');
            io.to(match.p2).emit('matchFinished');

            delete activeMatches[matchId];
        }
    });

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(p => p.id !== socket.id);
        io.emit('queueUpdate', waitingQueue.length);
    });
});

server.listen(3001, () => console.log('Server running on port 3001'));