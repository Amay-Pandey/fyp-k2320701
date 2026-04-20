import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = ({ onLoginSuccess }) => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const url = `${import.meta.env.VITE_BACKEND_URL}${endpoint}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Something went wrong');

            if (isLogin) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                if (onLoginSuccess) onLoginSuccess();
                navigate('/');
            } else {
                alert("Account created! Please login.");
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{ maxWidth: '300px', margin: '50px auto' }}>
            <h2>{isLogin ? 'Login' : 'Register'}</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text" placeholder="Username" required
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{ display: 'block', width: '100%', marginBottom: '10px' }}
                />
                <input
                    type="password" placeholder="Password" required
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ display: 'block', width: '100%', marginBottom: '10px' }}
                />
                
                {!isLogin && (
                    <>
                        <input
                            type="number" placeholder="Age"
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        />
                        <select onChange={(e) => setFormData({ ...formData, level: e.target.value })}>
                            <option value="Beginner">Beginner</option>
                            <option value="Weekly casual">Weekly casual</option>
                            <option value="Tier 1/2/3 BE">Tier 1/2/3 BE</option>
                            <option value="Bi-weekly casual">Bi-weekly casual</option>
                            <option value="Occasional tournament player">Occasional tournament player</option>
                            <option value="ISO medal holder">ISO medal holder</option>
                            <option value="Badminton England rated">Badminton England rated</option>
                        </select>
                    </>
                )}
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none' }}>
                    {isLogin ? 'Login' : 'Sign Up'}
                </button>
            </form>
            <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: 'pointer', color: 'blue', marginTop: '10px' }}>
                {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </p>
        </div>
    );
};

export default Auth;