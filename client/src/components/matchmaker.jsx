import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_URL);

const Matchmaker = ({ onLogout }) => {
    const [queueCount, setQueueCount] = useState(0);
    const [matchData, setMatchData] = useState(null);
    const [inQueue, setInQueue] = useState(false);

    useEffect(() => {
        socket.on('queueUpdate', (count) => setQueueCount(count));
        socket.on('matchFound', (data) => {
            setMatchData(data);
            setInQueue(false);
        });

        return () => {
            socket.off('queueUpdate');
            socket.off('matchFound');
        };
    }, []);

    const joinQueue = () => {
        const token = localStorage.getItem('token');
        socket.emit('joinQueue', { token });
        setInQueue(true);
    };

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <button onClick={handleLogout} style={{ float: 'right' }}>Logout</button>
            <h1>🏸 CourtSync</h1>
            
            {matchData ? (
                <div style={{ border: '2px solid green', padding: '20px', borderRadius: '10px' }}>
                    <h2>Match Found!</h2>
                    <p>Opponent: <strong>{matchData.opponentName}</strong></p>
                    <p>Go to: <strong>Court {matchData.court}</strong></p>
                    <button onClick={() => setMatchData(null)}>Finish Match</button>
                </div>
            ) : (
                <div>
                    <h3>Players Waiting: {queueCount}</h3>
                    <button 
                        onClick={joinQueue} 
                        disabled={inQueue}
                        style={{ padding: '15px 30px', backgroundColor: inQueue ? '#ccc' : '#4CAF50', color: 'white' }}
                    >
                        {inQueue ? 'Waiting for match...' : 'Join Matchmaking'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Matchmaker;