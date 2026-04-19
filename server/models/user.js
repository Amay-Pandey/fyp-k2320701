const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: Number,
    level: { 
        type: String, 
        enum: ['Beginner', 'Weekly casual', 'Bi-weekly casual', 'Occasional tournament player', 'ISO medal holder', 'Badminton England rated', 'Tier 1/2/3 BE'] 
    },
    elo: { type: Number, default: 1200 }
});