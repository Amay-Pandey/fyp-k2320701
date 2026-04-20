import mongoose from 'mongoose'; // Change from require

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
        player3: String,
        player4: String,
        court: Number,
        matchId: String,
        status: { type: String, enum: ['ongoing', 'finished'], default: 'ongoing' },
        startTime: { type: Date, default: Date.now },
        score: {
            player1: { type: Number, default: 0 },
            player2: { type: Number, default: 0 },
            player3: { type: Number, default: 0 },
            player4: { type: Number, default: 0 }
        },
        winner: String,
        winnerTeam: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema); // Change from module.exports