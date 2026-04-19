const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    title: { type: String, default: "Badminton Session" },
    numCourts: { type: Number, default: 1 },
    isDoubles: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    players: [{
        username: String,
        isGuest: { type: Boolean, default: false },
        rating: { type: Number, default: 1500 }
    }],
    matches: [{
        player1: String,
        player2: String,
        player3: String, // Optional for doubles
        player4: String, // Optional for doubles
        court: Number,
        matchId: String,
        status: { type: String, enum: ['ongoing', 'finished'], default: 'ongoing' },
        createdAt: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Session', sessionSchema);