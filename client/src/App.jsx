import { useState } from 'react';
import Auth from './components/auth';
import Matchmaker from './components/matchmaker';

function App() {
    // Lean check: do we have a token?
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

    return (
        <div>
            {isLoggedIn ? (
                <Matchmaker onLogout={() => setIsLoggedIn(false)} />
            ) : (
                <Auth onLoginSuccess={() => setIsLoggedIn(true)} />
            )}
        </div>
    );
}

export default App;