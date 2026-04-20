import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [view, setView] = useState('overview'); 
    const [userStats, setUserStats] = useState({ elo: 1500, username: '', matchHistory: [] });
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [matchTimer, setMatchTimer] = useState(0);
    const [selectedWinner, setSelectedWinner] = useState({});
    const [matchScores, setMatchScores] = useState({});
    const [newPlayerName, setNewPlayerName] = useState('');
    const [replacementSelection, setReplacementSelection] = useState({});
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

    const totalGames = userStats.matchHistory.length;
    const totalWins = userStats.matchHistory.filter((match) => match.isWin).length;
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const currentStreak = (() => {
        let streak = 0;
        for (let i = userStats.matchHistory.length - 1; i >= 0; i -= 1) {
            if (userStats.matchHistory[i].isWin) {
                streak += 1;
            } else if (streak > 0) {
                break;
            } else {
                streak -= 1;
                break;
            }
        }
        return streak;
    })();
    const streakLabel = currentStreak >= 0 ? `${currentStreak} Wins` : `${-currentStreak} Loss`;

    const isMatchComplete = (match) => {
        if (!activeSession) return false;
        if (activeSession.isDoubles) {
            return Boolean(match.player1 && match.player2 && match.player3 && match.player4);
        }
        return Boolean(match.player1 && match.player2);
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

            // 3. Fetch Session History for browsing old sessions
            await fetchSessionHistory();
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
            setErrorMessage('Connection lost. Please refresh or check backend logs.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/api/session/history`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSessionHistory(data || []);
            }
        } catch (err) {
            console.error('Session history fetch error:', err);
        }
    };

    const handleSessionSelect = async (sessionId) => {
        try {
            const res = await fetch(`${API_URL}/api/session/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedSession(data);
                setView('session-summary');
            }
        } catch (err) {
            console.error('Failed to load session details:', err);
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

    const handleAddPlayer = async () => {
        if (!newPlayerName.trim()) {
            setMatchActionError('Enter a name to add a player.');
            return;
        }

        setMatchActionError('');
        try {
            const res = await fetch(`${API_URL}/api/session/player/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ sessionId: activeSession._id, username: newPlayerName.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add player');
            setActiveSession(data.session);
            setNewPlayerName('');
        } catch (err) {
            setMatchActionError(err.message);
        }
    };

    const handleRemoveQueuePlayer = async (username) => {
        setMatchActionError('');
        try {
            const res = await fetch(`${API_URL}/api/session/player/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ sessionId: activeSession._id, username })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove player');
            setActiveSession(data.session);
        } catch (err) {
            setMatchActionError(err.message);
        }
    };

    const handleReplacePlayer = async (match, field) => {
        const key = `${match.matchId}-${field}`;
        const replacementUsername = replacementSelection[key];

        if (!replacementUsername) {
            setMatchActionError('Select a replacement from the queue first.');
            return;
        }

        setMatchActionError('');
        try {
            const res = await fetch(`${API_URL}/api/session/player/replace`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sessionId: activeSession._id,
                    matchId: match.matchId,
                    field,
                    replacementUsername
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to replace player');
            setActiveSession(data.session);
            setReplacementSelection((prev) => ({ ...prev, [key]: '' }));
        } catch (err) {
            setMatchActionError(err.message);
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

    const sessionToShow = selectedSession || activeSession;

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
                .topbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; background: linear-gradient(135deg, #1d2b64, #1c92d2); padding: 24px 28px; border-radius: 20px; margin-bottom: 20px; color: #fff; }
                .brand { font-size: 1.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
                .brand strong { font-weight: 800; }
                .subtext { margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 0.95rem; }
                .user-slot { display: flex; gap: 18px; align-items: center; }
                .user-slot .small-label { margin: 0 0 4px; color: rgba(255,255,255,0.7); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.14em; }
                .top-tabs { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
                .top-tabs button { background: #171a20; color: #b5b8c7; border: 1px solid transparent; border-radius: 999px; padding: 12px 20px; transition: all 0.2s ease; }
                .top-tabs button.active { background: #2f7be5; color: #fff; border-color: rgba(75,154,255,0.35); }
                .hero-card { display: flex; justify-content: space-between; align-items: center; gap: 20px; background: linear-gradient(135deg, #3e70d1, #22c1c3); padding: 26px 30px; border-radius: 22px; margin-bottom: 20px; box-shadow: 0 20px 55px rgba(0, 0, 0, 0.18); }
                .hero-card h2 { margin: 0; font-size: 2rem; letter-spacing: 0.02em; }
                .hero-card p { margin: 10px 0 0; color: rgba(255,255,255,0.92); }
                .rank-badge { background: rgba(255,255,255,0.13); padding: 20px 24px; border-radius: 20px; text-align: center; min-width: 132px; }
                .rank-badge span { display: block; color: rgba(255,255,255,0.8); font-size: 0.82rem; letter-spacing: 0.16em; text-transform: uppercase; }
                .rank-badge strong { display: block; margin-top: 10px; font-size: 2.1rem; }
                .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 30px; }
                .summary-card { background: #161a22; border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 24px; }
                .summary-card span { display: block; color: #a9c6ff; font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }
                .summary-card strong { display: block; color: #fff; font-size: 2rem; }
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
                @media (max-width: 960px) {
                    .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }
                @media (max-width: 700px) {
                    .topbar, .hero-card { flex-direction: column; align-items: flex-start; }
                    .top-tabs { justify-content: center; }
                    .summary-grid { grid-template-columns: 1fr; }
                }
                `}
            </style>

            <div className="dash-card">
                {errorMessage && <div className="error-banner">{errorMessage}</div>}
                
                <header className="topbar">
                    <div>
                        <div className="brand">
                            <span>COURT</span><strong>SYNC</strong>
                        </div>
                        <p className="subtext">Player Portal</p>
                    </div>
                    <div className="user-slot">
                        <div>
                            <p className="small-label">Logged in as</p>
                            <strong>{userStats.username}</strong>
                        </div>
                        <button className="logout-btn" onClick={handleLogout}>Logout</button>
                    </div>
                </header>

                <nav className="top-tabs">
                    <button className={view === 'overview' ? 'active' : ''} onClick={() => {
                        setSelectedSession(null);
                        setView('overview');
                    }}>My Stats</button>
                    <button className={view === 'session-history' ? 'active' : ''} onClick={() => {
                        setSelectedSession(null);
                        fetchSessionHistory();
                        setView('session-history');
                    }}>Leaderboard</button>
                    <button className={view === 'session-setup' ? 'active' : ''} onClick={() => {
                        setSelectedSession(null);
                        setView('session-setup');
                    }}>Settings</button>
                    {activeSession?.isActive && (
                        <button className={view === 'active-match' ? 'active' : ''} onClick={() => {
                            setSelectedSession(null);
                            setView('active-match');
                        }}>
                            Current Match
                        </button>
                    )}
                </nav>

                <section className="hero-card">
                    <div>
                        <h2>WELCOME BACK, {userStats.username.toUpperCase()}</h2>
                        <p>Your rank in the last session was #{userStats.matchHistory.length > 0 ? 1 : '-'}</p>
                    </div>
                    <div className="rank-badge">
                        <span>RANK</span>
                        <strong>#{userStats.matchHistory.length > 0 ? 1 : '-'}</strong>
                    </div>
                </section>

                <section className="summary-grid">
                    <div className="summary-card">
                        <span>Games Played</span>
                        <strong>{totalGames}</strong>
                    </div>
                    <div className="summary-card">
                        <span>Wins</span>
                        <strong>{totalWins}</strong>
                    </div>
                    <div className="summary-card">
                        <span>Win Rate</span>
                        <strong>{winRate}%</strong>
                    </div>
                    <div className="summary-card">
                        <span>Current Streak</span>
                        <strong>{streakLabel}</strong>
                    </div>
                </section>

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

                {view === 'session-history' && (
                    <section>
                        <h3>Past Sessions</h3>
                        {sessionHistory.length > 0 ? (
                            <div style={{ display: 'grid', gap: '14px' }}>
                                {sessionHistory.map((session) => (
                                    <div key={session._id} style={{ background: '#181818', padding: '18px', borderRadius: '12px', border: '1px solid #333' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', flexWrap: 'wrap' }}>
                                            <div>
                                                <h4 style={{ margin: 0 }}>{session.title || 'Untitled session'}</h4>
                                                <p style={{ margin: '6px 0 0', color: '#aaa' }}>{new Date(session.createdAt).toLocaleString()}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, color: '#888' }}>{session.isActive ? 'Active' : 'Closed'}</p>
                                                <p style={{ margin: '4px 0 0', color: '#aaa' }}>{session.players.length} players</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                                            <span style={{ color: '#ccc' }}>Matches: {session.matches.length}</span>
                                            <span style={{ color: '#ccc' }}>Finished: {session.matches.filter((m) => m.status === 'finished').length}</span>
                                            <span style={{ color: '#ccc' }}>Ongoing: {session.matches.filter((m) => m.status === 'ongoing').length}</span>
                                        </div>
                                        <button
                                            className="btn-primary"
                                            style={{ marginTop: '14px' }}
                                            onClick={() => handleSessionSelect(session._id)}
                                        >
                                            View Summary
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#666' }}>No past sessions found yet. Create one to start saving sessions.</p>
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

                {view === 'session-summary' && sessionToShow && (
                    <section>
                        <h2 className="text-green">Session Summary</h2>
                        <p style={{ color: '#aaa' }}>Session: {sessionToShow.title || 'CourtSync Session'}</p>
                        <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: '12px', padding: '20px', maxWidth: '700px', margin: '20px auto' }}>
                            <p><strong>Total players:</strong> {sessionToShow.players.length}</p>
                            <p><strong>Total matches:</strong> {sessionToShow.matches.length}</p>
                            <p><strong>Completed matches:</strong> {sessionToShow.matches.filter((m) => m.status === 'finished').length}</p>
                            <p><strong>Ongoing matches:</strong> {sessionToShow.matches.filter((m) => m.status === 'ongoing').length}</p>
                            <p><strong>Session status:</strong> {sessionToShow.isActive ? 'Active' : 'Closed'}</p>
                        </div>
                        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                            {sessionToShow.matches.map((match, idx) => (
                                <div key={idx} style={{ background: '#252525', padding: '18px', borderRadius: '10px', marginBottom: '12px' }}>
                                    <p style={{ fontWeight: '700' }}>Court {match.court}</p>
                                    <p>
                                        <strong>{match.player1 || 'Vacant'}</strong> & <strong>{match.player2 || 'Vacant'}</strong>
                                        {match.player3 || match.player4 ? ` vs ${match.player3 || 'Vacant'} & ${match.player4 || 'Vacant'}` : ''}
                                    </p>
                                    <p>Status: {match.status.toUpperCase()}</p>
                                    {match.status === 'finished' && (
                                        <p>Winner: {match.winner}</p>
                                    )}
                                    <p>Score: {match.score?.team1} - {match.score?.team2}</p>
                                </div>
                            ))}
                        </div>
                        <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => {
                            setSelectedSession(null);
                            setView(selectedSession ? 'session-history' : 'overview');
                        }}>
                            {selectedSession ? 'Back to Session History' : 'Back to Dashboard'}
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
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '16px', margin: '0 auto 20px', maxWidth: '700px' }}>
                            <h4 style={{ margin: '0 0 10px', color: '#bbb' }}>Add Player to Queue</h4>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    placeholder="Player name"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    style={{ flex: 1, minWidth: '180px', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#121212', color: '#fff' }}
                                />
                                <button className="btn-primary" onClick={handleAddPlayer}>
                                    Add Player
                                </button>
                            </div>
                        </div>
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '16px', margin: '0 auto 20px', maxWidth: '700px' }}>
                            <h4 style={{ margin: '0 0 10px', color: '#bbb' }}>Waiting Queue</h4>
                            {waitingQueue.length > 0 ? (
                                waitingQueue.map((player) => (
                                    <div key={player.username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222' }}>
                                        <div>
                                            <div>{player.username}</div>
                                            <div style={{ color: '#888', fontSize: '0.85rem' }}>Waiting {queueWaitTime(player.joinedAt)}</div>
                                        </div>
                                        <button
                                            className="btn-primary"
                                            style={{ background: '#c62828', borderColor: '#a82424' }}
                                            onClick={() => handleRemoveQueuePlayer(player.username)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#666' }}>No waiting players at the moment.</p>
                            )}
                        </div>
                        {activeSession.matches?.filter(m => m.status === 'ongoing').length > 0 ? (
                            activeSession.matches.filter(m => m.status === 'ongoing').map((match, idx) => (
                                <div key={idx} style={{ background: '#252525', padding: '20px', borderRadius: '10px', marginBottom: '20px', textAlign: 'left' }}>
                                    <p><strong>Court {match.court}</strong></p>
                                    <p style={{ margin: '6px 0' }}>
                                        <strong>{match.player1 || 'Vacant'}</strong> <span style={{ color: '#666' }}>vs</span> <strong>{match.player2 || 'Vacant'}</strong>
                                    </p>
                                    {match.player3 || match.player4 ? (
                                        <p style={{ margin: '6px 0' }}>
                                            <strong>{match.player3 || 'Vacant'}</strong> <span style={{ color: '#666' }}>vs</span> <strong>{match.player4 || 'Vacant'}</strong>
                                        </p>
                                    ) : null}

                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                                        {isMatchComplete(match) ? (
                                            match.player3 && match.player4 ? (
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
                                            )
                                        ) : (
                                            <div style={{ color: '#f0a500', fontSize: '0.95rem' }}>
                                                Match line-up is incomplete. Fill all required player spots before finishing this match.
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                                        {waitingQueue.length > 0 && (
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <label style={{ color: '#aaa' }}>Replace a player from this match</label>
                                                {(activeSession.isDoubles ? ['player1', 'player2', 'player3', 'player4'] : ['player1', 'player2']).map((field) => {
                                                    const currentName = match[field] || 'Vacant spot';
                                                    const key = `${match.matchId}-${field}`;
                                                    return (
                                                        <div key={key} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                            <span style={{ color: '#ddd', minWidth: '90px' }}>{currentName}</span>
                                                            <select
                                                                value={replacementSelection[key] || ''}
                                                                onChange={(e) => setReplacementSelection({ ...replacementSelection, [key]: e.target.value })}
                                                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#1a1a1a', color: '#fff' }}
                                                            >
                                                                <option value="">Choose replacement</option>
                                                                {waitingQueue.map((player) => (
                                                                    <option key={player.username} value={player.username}>{player.username}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ padding: '10px 16px' }}
                                                                onClick={() => handleReplacePlayer(match, field)}
                                                            >
                                                                Replace
                                                            </button>
                                                            {match[field] && (
                                                                <button
                                                                    className="btn-primary"
                                                                    style={{ padding: '10px 16px', background: '#c62828', borderColor: '#a82424' }}
                                                                    onClick={() => handleRemoveQueuePlayer(match[field])}
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
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
                                        disabled={endingMatchId === match.matchId || !isMatchComplete(match)}
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