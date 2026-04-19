const mongoose = require('mongoose');
//this is the user model for the database, it defines the structure of the user document in MongoDB
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rating: { type: Number, default: 1500 },//inspired from chess.com rating principles
    rd: { type: Number, default: 350 }, // Rating Deviation
    vol: { type: Number, default: 0.06 }, // Volatility
    matchesPlayed: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);