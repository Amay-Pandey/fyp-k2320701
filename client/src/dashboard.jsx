import { useState, useEffect } from 'react';

const Dashboard = () => {
    const [view, setView] = useState('overview');
    const [userStats, setUserStats] = useState({ elo: 0, username: '', matchHistory: [] });

    // ... (Your useEffect for fetching stats goes here)

    const renderHistory = () => (
        <div className="history-section">
            <h3>Your Match History</h3>
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
                                <td className={m.isWin ? 'text-green' : 'text-red'}>
                                    {m.isWin ? '🏆 WIN' : '❌ LOSS'}
                                </td>
                                <td className={diff > 0 ? 'text-green' : 'text-red'}>
                                    {diff > 0 ? `+${diff}` : diff}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="dashboard-container">
            {/* 1. CSS GOES HERE */}
            <style>
                {`
                .dashboard-container { 
                    background: #121212; 
                    color: white; 
                    min-height: 100vh; 
                    padding: 20px;
                    font-family: sans-serif;
                }
                .elo-badge {
                    background: #1e1e1e;
                    padding: 10px 20px;
                    border-radius: 8px;
                    display: inline-block;
                    margin-bottom: 20px;
                    border: 1px solid #333;
                }
                nav { margin-bottom: 30px; }
                button {
                    background: #333;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    margin-right: 10px;
                    border-radius: 5px;
                    cursor: pointer;
                }
                button:hover { background: #444; }
                .text-green { color: #4CAF50; font-weight: bold; }
                .text-red { color: #f44336; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; border-bottom: 1px solid #333; text-align: left; }
                th { color: #888; text-transform: uppercase; font-size: 0.8rem; }
                `}
            </style>
            
            {/* 2. THE ACTUAL CONTENT FOLLOWS */}
            <header>
                <h1>Welcome, {userStats.username}</h1>
                <div className="elo-badge">
                    Current ELO: <span className="text-green">{Math.round(userStats.elo)}</span>
                </div>
            </header>

            <nav>
                <button onClick={() => setView('overview')}>History</button>
                <button onClick={() => setView('session-setup')}>Start New Session</button>
            </nav>

            {view === 'overview' && (
                <section className="history">
                    {userStats.matchHistory.length > 0 ? renderHistory() : <p>No matches yet.</p>}
                </section>
            )}

            {/* Other views (SessionSetupForm, etc.) */}
        </div>
    );
};

export default Dashboard;