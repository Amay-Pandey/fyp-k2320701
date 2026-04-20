import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: Number,
    level: String,
    // Glicko-2 specific fields
    rating: { type: Number, default: 1500 },
    rd: { type: Number, default: 350 },
    vol: { type: Number, default: 0.06 },
    // Match History for the Dashboard
    matchHistory: [{
        opponent: String,
        teammate: String, // Useful for doubles
        isWin: Boolean,
        eloBefore: Number,
        eloAfter: Number,
        matchDate: { type: Date, default: Date.now }
    }]
});

export default mongoose.model('User', userSchema);