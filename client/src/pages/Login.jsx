// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css'; // Assuming you have a CSS file for styling

const Login = () => {
    // --- state ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setError] = useState('');
    const [isLoading, setLoading] = useState(false);

    const navigate = useNavigate();

    // --- simple client-side validation ---
    const validate = () => {
        if (!email || !password) {
            setError('Both fields are required');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Invalid email format');
            return false;
        }
        setError('');
        return true;
    };

    // --- handle form submit ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('http://localhost:3000/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.status === 200) {
                const { token } = await res.json();
                localStorage.setItem('token', token);
                localStorage.setItem('email', email); // Added by Meir so that we can use it in SendMailComponent
                navigate('/label/inbox');
            } else {
                let errorMsg = 'Login failed';
                try {
                    const data = await res.json();
                    errorMsg = data?.error || errorMsg;
                } catch (jsonErr) {
                    console.warn('Failed to parse error JSON:', jsonErr);
                }
                setError(errorMsg);
            }
        } catch (err) {
            console.error('Network error:', err);
            setError('Could not connect to server');
        } finally {
            setLoading(false);
        }
    }

    // --- render ---
    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Login</h2>
                <p className="login-subtitle">Continue to FooMail</p>

                {errorMessage && (
                    <div className="login-error">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="please enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="please enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {isLoading && <p className="login-loading">Logging in...</p>}

                    <button type="submit" className="login-button">Login</button>

                    <p className="register-link">
                        Don't have an account?{" "}
                        <span onClick={() => navigate("/register")}>
                            Register here
                        </span>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
