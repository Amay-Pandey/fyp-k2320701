import { useState } from 'react';
import Auth from './components/auth';
import Matchmaker from './components/matchmaker';

function App() {
  const token = localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/" element={token ? <Dashboard /> : <Navigate to="/auth" />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </Router>
  );
}

export default App;