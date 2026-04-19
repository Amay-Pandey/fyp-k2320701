import { useState, useEffect } from 'react'
import io from 'socket.io-client'

const socket = io('https://fyp-k2320701.onrender.com')

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [queueCount, setQueueCount] = useState(0);
  const [matchData, setMatchData] = useState(null);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('queueUpdate', (count) => setQueueCount(count));
    socket.on('matchFound', (data) => setMatchData(data));
    
    // The server is the "boss" - when it says finish, we finish
    socket.on('matchFinished', () => {
      setMatchData(null);
      alert("Match recorded! Your ratings have been updated.");
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('queueUpdate');
      socket.off('matchFound');
      socket.off('matchFinished');
    }
  }, []);

  // --- ADDED THIS FUNCTION BACK ---
  const joinQueue = () => {
    const name = "Player_" + socket.id.substring(0, 3);
    socket.emit('joinQueue', { name });
  };

  const submitResult = (didIWin) => {
    socket.emit('matchResult', {
      matchId: matchData.matchId,
      winnerId: didIWin ? socket.id : matchData.opponentId,
      loserId: didIWin ? matchData.opponentId : socket.id
    });
    // We don't call setMatchData(null) here anymore. 
    // We wait for the server to send 'matchFinished' to be sure it worked!
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>🏸 Badminton Matchmaker</h1>
      
      {matchData ? (
        <div style={{ border: '2px solid #4CAF50', padding: '30px', borderRadius: '15px', backgroundColor: '#f9fff9' }}>
          <h2 style={{ color: '#2e7d32' }}>MATCH IN PROGRESS</h2>
          <p>Playing against: <strong>{matchData.opponentName}</strong></p>
          <p>Location: <strong>Court {matchData.court}</strong></p>
          <hr />
          <h3>Who won?</h3>
          <p style={{fontSize: '0.8rem', color: '#666'}}>(Only one player needs to click)</p>
          <button onClick={() => submitResult(true)} style={{ marginRight: '10px', backgroundColor: '#4CAF50', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>I Won</button>
          <button onClick={() => submitResult(false)} style={{ backgroundColor: '#f44336', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>I Lost</button>
        </div>
      ) : (
        <div>
          <p>Status: {isConnected ? '✅ Ready' : '❌ Connecting to server...'}</p>
          <div style={{ margin: '20px', padding: '20px', background: '#eee', borderRadius: '10px' }}>
            <h3>In Queue: {queueCount}</h3>
          </div>
          <button 
            disabled={!isConnected} 
            onClick={joinQueue} 
            style={{ 
              padding: '15px 30px', 
              fontSize: '1.2rem', 
              cursor: isConnected ? 'pointer' : 'not-allowed',
              backgroundColor: isConnected ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            Join Matchmaking
          </button>
        </div>
      )}
    </div>
  );
}

export default App;