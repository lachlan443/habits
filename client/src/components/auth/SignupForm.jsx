import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { detectUserTimezone, getTimezoneList } from '../../utils/timezoneUtils';

function SignupForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timezone, setTimezone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const timezones = getTimezoneList();

  useEffect(() => {
    const detected = detectUserTimezone();
    setTimezone(detected);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!timezone) {
      setError('Please select a timezone');
      return;
    }

    setLoading(true);

    try {
      await signup(username, password, timezone);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-line rounded text-sm box-border transition-colors focus:outline-none focus:border-brand";
  const labelClass = "block mb-1.5 text-ink-muted text-sm font-medium";

  return (
    <div className="flex justify-center items-center min-h-screen bg-surface-hover p-4">
      <div className="bg-white p-8 sm:p-10 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.1)] w-full max-w-md">
        <h1 className="m-0 mb-2 text-2xl font-semibold text-brand">habits</h1>
        <h2 className="m-0 mb-8 text-xl font-medium text-ink">Sign Up</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-bg text-danger-text px-3 py-3 rounded mb-5 text-sm">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="username" className={labelClass}>Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className={labelClass}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="timezone" className={labelClass}>Timezone</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              className={`${inputClass} bg-white cursor-pointer`}
            >
              <option value="">Select timezone...</option>
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand text-white rounded text-base font-medium cursor-pointer transition-colors hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-soft">
          Already have an account?{' '}
          <Link to="/login" className="text-brand no-underline font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupForm;
