import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-surface-hover p-4">
      <div className="bg-white p-8 sm:p-10 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.1)] w-full max-w-md">
        <h1 className="m-0 mb-2 text-2xl font-semibold text-brand">habits</h1>
        <h2 className="m-0 mb-8 text-xl font-medium text-ink">Login</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-bg text-danger-text px-3 py-3 rounded mb-5 text-sm">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="username" className="block mb-1.5 text-ink-muted text-sm font-medium">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-line rounded text-sm box-border transition-colors focus:outline-none focus:border-brand"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="block mb-1.5 text-ink-muted text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-line rounded text-sm box-border transition-colors focus:outline-none focus:border-brand"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand text-white rounded text-base font-medium cursor-pointer transition-colors hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-soft">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand no-underline font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
