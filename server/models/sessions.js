const sessionSchema = new mongoose.Schema({
    title: String,
    adminId: mongoose.Schema.Types.ObjectId, // The person whose device is being used
    numCourts: Number,
    isDoubles: Boolean,
    isActive: { type: Boolean, default: true },
    players: [{
        name: String,
        isGuest: Boolean,
        elo: Number,
        lastMatchTime: Date
    }],
    matches: [{
        player1: String,
        player2: String, // or arrays for doubles
        court: Number,
        status: { type: String, enum: ['ongoing', 'finished'], default: 'ongoing' }
    }]
});