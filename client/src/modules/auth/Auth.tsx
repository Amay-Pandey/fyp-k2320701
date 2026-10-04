import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthFormData {
    username: string;
    password: string;
    age?: string;
    level?: string;
}

interface AuthResponse {
    token?: string;
    username?: string;
    error?: string;
}

interface AuthProps {
    onLoginSuccess?: () => void;
}

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Something went wrong';

const Auth = ({ onLoginSuccess }: AuthProps) => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState<AuthFormData>({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const url = `${import.meta.env.VITE_BACKEND_URL}${endpoint}`;

        const payload = isLogin ? formData : {
            username: formData.username,
            password: formData.password,
            age: formData.age,
            level: formData.level || 'Beginner'
        };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json() as AuthResponse;

            if (!res.ok) throw new Error(data.error ?? 'Something went wrong');

            if (isLogin) {
                if (!data.token || !data.username) throw new Error('Invalid login response');
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                if (onLoginSuccess) onLoginSuccess();
                navigate('/');
            } else {
                alert("Account created! Please login.");
                setIsLogin(true);
                setFormData({ username: '', password: '', age: '', level: 'Beginner' });
            }
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <div className="auth-page">
            <style>{`
                .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f1117; padding: 24px; font-family: 'Inter', sans-serif; }
                .auth-card { width: min(520px, 100%); background: #141821; border: 1px solid #242a35; border-radius: 24px; box-shadow: 0 30px 70px rgba(0, 0, 0, 0.35); overflow: hidden; }
                .auth-header { background: linear-gradient(135deg, #1d2b64, #1c92d2); padding: 32px 28px; color: #fff; }
                .auth-header h1 { margin: 0; font-size: 2rem; letter-spacing: 0.12em; text-transform: uppercase; }
                .auth-header p { margin: 10px 0 0; color: rgba(255,255,255,0.85); font-size: 0.95rem; }
                .auth-body { padding: 32px 28px 28px; display: grid; gap: 20px; }
                .auth-switch { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
                .auth-switch button { border: none; background: transparent; color: #7da7ff; cursor: pointer; font-weight: 600; }
                .auth-switch button.active { color: #fff; }
                .auth-form { display: grid; gap: 16px; }
                .auth-form input, .auth-form select { width: 100%; padding: 14px 16px; border-radius: 14px; border: 1px solid #2e3340; background: #0f131a; color: #eef2ff; font-size: 0.95rem; }
                .auth-form input::placeholder, .auth-form select { color: #8fa3c5; }
                .auth-form button { border: none; border-radius: 14px; padding: 14px 16px; background: linear-gradient(135deg, #4b86ff, #66d4ff); color: #08101e; font-weight: 700; cursor: pointer; transition: transform 0.2s ease; }
                .auth-form button:hover { transform: translateY(-1px); }
                .auth-footer { color: #c7d2ff; font-size: 0.95rem; text-align: center; }
                .auth-footer span { color: #7da7ff; cursor: pointer; }
                .auth-error { color: #ff6f6f; padding: 12px 16px; border-radius: 12px; background: rgba(244, 67, 54, 0.12); border: 1px solid rgba(244, 67, 54, 0.25); }
            `}</style>

            <div className="auth-card">
                <div className="auth-header">
                    <h1>COURT SYNC</h1>
                    <p>{isLogin ? 'Sign in to access your player portal and match dashboard.' : 'Create your account to join sessions and track your progress.'}</p>
                </div>

                <div className="auth-body">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="auth-switch">
                        <button className={isLogin ? 'active' : ''} onClick={() => setIsLogin(true)}>Login</button>
                        <button className={!isLogin ? 'active' : ''} onClick={() => setIsLogin(false)}>Register</button>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Username"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        {!isLogin && (
                            <>
                                <input
                                    type="number"
                                    placeholder="Age"
                                    value={formData.age || ''}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                />
                                <select
                                    value={formData.level || 'Beginner'}
                                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                >
                                    <option value="Beginner">Beginner (600 rating)</option>
                                    <option value="Weekly casual">Weekly casual (800 rating)</option>
                                    <option value="Tier 1/2/3 BE">Tier 1/2/3 BE (2000 rating)</option>
                                    <option value="Bi-weekly casual">Bi-weekly casual (1000 rating)</option>
                                    <option value="Occasional tournament player">Occasional tournament player (1600 rating)</option>
                                    <option value="ISO medal holder">ISO medal holder (1800 rating)</option>
                                    <option value="Badminton England rated">Badminton England rated (1700 rating)</option>
                                </select>
                            </>
                        )}
                        <button type="submit">{isLogin ? 'Login' : 'Create Account'}</button>
                    </form>

                    <div className="auth-footer">
                        {isLogin ? (
                            <span onClick={() => setIsLogin(false)}>Need an account? Register</span>
                        ) : (
                            <span onClick={() => setIsLogin(true)}>Have an account? Login</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;