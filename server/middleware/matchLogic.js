export const findMatch = (session) => {
    // 1. Find players not currently in an 'ongoing' match
    const busyPlayers = session.matches
        .filter(m => m.status === 'ongoing')
        .flatMap(m => [m.player1, m.player2]);

    const availablePlayers = session.players.filter(p => !busyPlayers.includes(p.name));

    // 2. Find available courts
    const busyCourts = session.matches.filter(m => m.status === 'ongoing').map(m => m.court);
    const allCourts = Array.from({ length: session.numCourts }, (_, i) => i + 1);
    const freeCourt = allCourts.find(c => !busyCourts.includes(c));

    if (availablePlayers.length >= 2 && freeCourt) {
        // 3. Simple Skill-Based Sort (Elo)
        availablePlayers.sort((a, b) => a.elo - b.elo);
        
        // Pick the two closest in Elo
        return {
            player1: availablePlayers[0].name,
            player2: availablePlayers[1].name,
            court: freeCourt
        };
    }
    return null;
};