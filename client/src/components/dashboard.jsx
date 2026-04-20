import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [view, setView] = useState('overview'); 
    const [userStats, setUserStats] = useState({ elo: 1500, username: '', matchHistory: [] });
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [matchTimer, setMatchTimer] = useState(0);
    const [selectedWinner, setSelectedWinner] = useState({});
    const [matchScores, setMatchScores] = useState({});
    const [endingMatchId, setEndingMatchId] = useState(null);
    const [matchActionError, setMatchActionError] = useState('');

    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_BACKEND_URL;

    const waitingQueue = activeSession?.players
        .filter((player) => !activeSession.matches.some((m) => m.status === 'ongoing' && [m.player1, m.player2, m.player3, m.player4].includes(player.username)))
        .sort((a, b) => {
            const aTime = new Date(a.joinedAt || activeSession?.createdAt || Date.now()).getTime();
            const bTime = new Date(b.joinedAt || activeSession?.createdAt || Date.now()).getTime();
            return aTime - bTime;
        }) || [];

    const queueWaitTime = (joinedAt) => {
        const start = new Date(joinedAt || activeSession?.createdAt || Date.now()).getTime();
        return formatTimer(Math.floor((Date.now() - start) / 1000));
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const ongoingMatch = activeSession?.matches?.find((m) => m.status === 'ongoing');
        if (!ongoingMatch) {
            setMatchTimer(0);
            return;
        }

        const start = ongoingMatch.startTime ? new Date(ongoingMatch.startTime).getTime() : Date.now();
        const updateTimer = () => setMatchTimer(Math.floor((Date.now() - start) / 1000));

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const fetchData = async () => {
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth');
                return;
            }

            // 1. Fetch User Stats
            const userRes = await fetch(`${API_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (userRes.ok) {
                const userData = await userRes.json();
                setUserStats({
                    elo: userData.rating || 1500,
                    username: userData.username || 'User',
                    matchHistory: userData.matchHistory || []
                });
            } else {
                setErrorMessage('Failed to load profile. Backend might be down.');
            }

            // 2. Fetch Active Session
            const sessionRes = await fetch(`${API_URL}/api/session/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                if (sessionData) {
                    setActiveSession(sessionData);
                    setView(sessionData.isActive ? 'active-match' : 'session-summary');
                } else {
                    setActiveSession(null);
                    setView('overview');
                }
            }
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
            setErrorMessage('Connection lost. Please refresh or check backend logs.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndMatch = async (match) => {
        setMatchActionError('');
        const winner = selectedWinner[match.matchId];

        if (!winner) {
            setMatchActionError('Select a winner before finishing the match.');
            return;
        }

        setEndingMatchId(match.matchId);
        try {
            const currentScore = matchScores[match.matchId] || {};
            const payload = {
                sessionId: activeSession._id,
                matchId: match.matchId,
                score: currentScore
            };

            if (match.player3 && match.player4) {
                payload.winnerTeam = winner;
            } else {
                payload.winnerName = winner;
            }

            const res = await fetch(`${API_URL}/api/session/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to end match');
            setActiveSession(data.session);
            setView(data.session.isActive ? 'active-match' : 'session-summary');
        } catch (err) {
            setMatchActionError(err.message);
        } finally {
            setEndingMatchId(null);
        }
    };

    const handleEndSession = async () => {
        setMatchActionError('');
        setEndingMatchId('session');
        try {
            const res = await fetch(`${API_URL}/api/session/close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ sessionId: activeSession._id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to end session');
            setActiveSession(data.session);
            setView('session-summary');
        } catch (err) {
            setMatchActionError(err.message);
        } finally {
            setEndingMatchId(null);
        }
    };

    const handleScoreChange = (matchId, field, value) => {
        setMatchScores((prev) => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                [field]: Number(value)
            }
        }));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/auth');
    };

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Connecting to CourtSync...</div>;

    return (
        <div className="dashboard-container">
            <style>
                {`
                .dashboard-container { background: #121212; color: #e0e0e0; min-height: 100vh; padding: 40px 20px; font-family: 'Inter', sans-serif; }
                .dash-card { background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 24px; max-width: 900px; margin: 0 auto; }
                header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .elo-display { font-size: 2rem; font-weight: 800; color: #4CAF50; }
                nav { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 1px solid #333; padding-bottom: 15px; }
                nav button { background: transparent; color: #888; border: none; padding: 10px 20px; cursor: pointer; font-weight: 600; transition: 0.2s; }
                nav button.active { color: #fff; border-bottom: 2px solid #4CAF50; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { text-align: left; color: #666; font-size: 0.8rem; text-transform: uppercase; padding: 12px; border-bottom: 1px solid #333; }
                td { padding: 15px 12px; border-bottom: 1px solid #2a2a2a; }
                .text-green { color: #4CAF50; font-weight: bold; }
                .text-red { color: #f44336; font-weight: bold; }
                .error-banner { background: #f4433622; color: #f44336; padding: 10px; border-radius: 6px; margin-bottom: 20px; text-align: center; border: 1px solid #f44336; }
                .setup-form { display: flex; flex-direction: column; gap: 15px; max-width: 500px; }
                .setup-form input, .setup-form textarea, .setup-form select { background: #2a2a2a; border: 1px solid #444; color: white; padding: 12px; border-radius: 6px; }
                .btn-primary { background: #4CAF50; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                .logout-btn { background: #333; color: #ff5252; border: 1px solid #444; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
                `}
            </style>

            <div className="dash-card">
                {errorMessage && <div className="error-banner">{errorMessage}</div>}
                
                <header>
                    <div>
                        <h1 style={{ margin: 0 }}>CourtSync</h1>
                        <p style={{ color: '#888' }}>Logged in as <strong>{userStats.username}</strong></p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="elo-display">{Math.round(userStats.elo)}</div>
                        <button className="logout-btn" onClick={handleLogout}>Logout</button>
                    </div>
                </header>

                <nav>
                    <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>History</button>
                    <button className={view === 'session-setup' ? 'active' : ''} onClick={() => setView('session-setup')}>New Session</button>
                    {activeSession?.isActive && (
                        <button className={view === 'active-match' ? 'active' : ''} onClick={() => setView('active-match')}>
                            Current Match
                        </button>
                    )}
                </nav>

                {view === 'overview' && (
                    <section>
                        <h3>Match History</h3>
                        {userStats.matchHistory.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Opponent</th>
                                        <th>Result</th>
                                        <th>Elo Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userStats.matchHistory.map((m, i) => {
                                        const diff = Math.round(m.eloAfter - m.eloBefore);
                                        return (
                                            <tr key={i}>
                                                <td>{new Date(m.matchDate).toLocaleDateString()}</td>
                                                <td>{m.opponent}</td>
                                                <td className={m.isWin ? 'text-green' : 'text-red'}>{m.isWin ? 'WIN' : 'LOSS'}</td>
                                                <td className={diff >= 0 ? 'text-green' : 'text-red'}>{diff >= 0 ? `+${diff}` : diff}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: '#666' }}>No matches recorded yet. Start a session to play!</p>
                        )}
                    </section>
                )}

                {view === 'session-setup' && (
                    <section>
                        <h3>Start a Session</h3>
                        <SessionSetupForm 
                            onStart={() => { fetchData(); }} // Refresh data to find the new session
                            API_URL={API_URL} 
                        />
                    </section>
                )}

                {view === 'session-summary' && activeSession && (
                    <section>
                        <h2 className="text-green">Session Summary</h2>
                        <p style={{ color: '#aaa' }}>Session: {activeSession.title || 'CourtSync Session'}</p>
                        <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: '12px', padding: '20px', maxWidth: '700px', margin: '20px auto' }}>
                            <p><strong>Total players:</strong> {activeSession.players.length}</p>
                            <p><strong>Total matches:</strong> {activeSession.matches.length}</p>
                            <p><strong>Completed matches:</strong> {activeSession.matches.filter((m) => m.status === 'finished').length}</p>
                            <p><strong>Ongoing matches:</strong> {activeSession.matches.filter((m) => m.status === 'ongoing').length}</p>
                            <p><strong>Session status:</strong> {activeSession.isActive ? 'Active' : 'Closed'}</p>
                        </div>
                        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                            {activeSession.matches.map((match, idx) => (
                                <div key={idx} style={{ background: '#252525', padding: '18px', borderRadius: '10px', marginBottom: '12px' }}>
                                    <p style={{ fontWeight: '700' }}>Court {match.court}</p>
                                    <p>{match.player1} & {match.player2} {match.player3 ? `vs ${match.player3} & ${match.player4}` : ''}</p>
                                    <p>Status: {match.status.toUpperCase()}</p>
                                    {match.status === 'finished' && (
                                        <p>Winner: {match.winner}</p>
                                    )}
                                    <p>Score: {match.score?.team1} - {match.score?.team2}</p>
                                </div>
                            ))}
                        </div>
                        <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setView('overview')}>
                            Back to Dashboard
                        </button>
                    </section>
                )}

                {view === 'active-match' && activeSession?.isActive && (
                    <section style={{ textAlign: 'center', padding: '40px 0' }}>
                        <h2 className="text-green">Match in Progress</h2>
                        <p style={{ color: '#aaa', marginBottom: '10px' }}>Session: {activeSession.title || 'CourtSync Session'}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                            <button className="btn-primary" style={{ minWidth: '140px' }} onClick={handleEndSession} disabled={endingMatchId === 'session'}>
                                {endingMatchId === 'session' ? 'Ending Session…' : 'End Session'}
                            </button>
                        </div>
                        {matchActionError && <div className="error-banner" style={{ margin: '0 auto 20px', maxWidth: '700px' }}>{matchActionError}</div>}
                        <div style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                            <p>Live timer: <strong>{formatTimer(matchTimer)}</strong></p>
                        </div>
                        {waitingQueue.length > 0 && (
                            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '16px', margin: '0 auto 20px', maxWidth: '700px' }}>
                                <h4 style={{ margin: '0 0 10px', color: '#bbb' }}>Waiting Queue</h4>
                                {waitingQueue.map((player) => (
                                    <div key={player.username} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222' }}>
                                        <span>{player.username}</span>
                                        <span style={{ color: '#888' }}>Waiting {queueWaitTime(player.joinedAt)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeSession.matches?.filter(m => m.status === 'ongoing').length > 0 ? (
                            activeSession.matches.filter(m => m.status === 'ongoing').map((match, idx) => (
                                <div key={idx} style={{ background: '#252525', padding: '20px', borderRadius: '10px', marginBottom: '20px', textAlign: 'left' }}>
                                    <p><strong>Court {match.court}</strong></p>
                                    <p style={{ margin: '6px 0' }}>
                                        <strong>{match.player1}</strong> <span style={{ color: '#666' }}>vs</span> <strong>{match.player2}</strong>
                                    </p>
                                    {match.player3 && match.player4 && (
                                        <p style={{ margin: '6px 0' }}>
                                            <strong>{match.player3}</strong> <span style={{ color: '#666' }}>vs</span> <strong>{match.player4}</strong>
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                                        {match.player3 && match.player4 ? (
                                            <>
                                                <label style={{ color: '#ddd' }}>
                                                    <input
                                                        type="radio"
                                                        name={`winner-${match.matchId}`}
                                                        value="team1"
                                                        checked={selectedWinner[match.matchId] === 'team1'}
                                                        onChange={(e) => setSelectedWinner({ ...selectedWinner, [match.matchId]: e.target.value })}
                                                    />
                                                    Team 1: {match.player1} & {match.player2}
                                                </label>
                                                <label style={{ color: '#ddd' }}>
                                                    <input
                                                        type="radio"
                                                        name={`winner-${match.matchId}`}
                                                        value="team2"
                                                        checked={selectedWinner[match.matchId] === 'team2'}
                                                        onChange={(e) => setSelectedWinner({ ...selectedWinner, [match.matchId]: e.target.value })}
                                                    />
                                                    Team 2: {match.player3} & {match.player4}
                                                </label>
                                            </>
                                        ) : (
                                            <>
                                                <label style={{ color: '#ddd' }}>
                                                    <input
                                                        type="radio"
                                                        name={`winner-${match.matchId}`}
                                                        value={match.player1}
                                                        checked={selectedWinner[match.matchId] === match.player1}
                                                        onChange={(e) => setSelectedWinner({ ...selectedWinner, [match.matchId]: e.target.value })}
                                                    />
                                                    {match.player1} wins
                                                </label>
                                                <label style={{ color: '#ddd' }}>
                                                    <input
                                                        type="radio"
                                                        name={`winner-${match.matchId}`}
                                                        value={match.player2}
                                                        checked={selectedWinner[match.matchId] === match.player2}
                                                        onChange={(e) => setSelectedWinner({ ...selectedWinner, [match.matchId]: e.target.value })}
                                                    />
                                                    {match.player2} wins
                                                </label>
                                            </>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            <label style={{ color: '#aaa' }}>Team 1 Score</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={matchScores[match.matchId]?.team1 || 0}
                                                onChange={(e) => handleScoreChange(match.matchId, 'team1', e.target.value)}
                                                style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#1a1a1a', color: '#fff' }}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            <label style={{ color: '#aaa' }}>Team 2 Score</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={matchScores[match.matchId]?.team2 || 0}
                                                onChange={(e) => handleScoreChange(match.matchId, 'team2', e.target.value)}
                                                style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#1a1a1a', color: '#fff' }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="btn-primary"
                                        style={{ marginTop: '18px' }}
                                        onClick={() => handleEndMatch(match)}
                                        disabled={endingMatchId === match.matchId}
                                    >
                                        {endingMatchId === match.matchId ? 'Ending…' : 'Finish Match'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>All matches finished. Generating next round...</p>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};

const SessionSetupForm = ({ onStart, API_URL }) => {
    const [formData, setFormData] = useState({
        title: '',
        numCourts: 1,
        isDoubles: false,
        playerNames: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/session/start`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                onStart();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || "Could not start session"}`);
            }
        } catch (err) {
            alert("Connection error. Check if backend is running.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="setup-form" onSubmit={handleSubmit}>
            <input type="text" placeholder="Session Title (e.g. Monday Social)" required 
                onChange={e => setFormData({...formData, title: e.target.value})} />
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <select style={{ flex: 1 }} onChange={e => setFormData({...formData, isDoubles: e.target.value === 'true'})}>
                    <option value="false">Singles</option>
                    <option value="true">Doubles</option>
                </select>
                <input style={{ flex: 1 }} type="number" placeholder="Courts" min="1" max="6" required 
                    onChange={e => setFormData({...formData, numCourts: parseInt(e.target.value)})} />
            </div>

            <textarea 
                placeholder="Enter player names (comma separated)... e.g. Amay, John, Sarah, Guest1" 
                required
                onChange={e => setFormData({...formData, playerNames: e.target.value})}
            />
            
            <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Initializing...' : 'Initialize Session'}
            </button>
        </form>
    );
};

export default Dashboard;