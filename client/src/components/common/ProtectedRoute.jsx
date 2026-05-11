import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function UnlockScreen() {
  const { unlockWithPassword, logout, user } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unlockWithPassword(password);
    } catch {
      setError('Incorrect password');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen flex-col gap-4 px-6">
      <h2 className="m-0 text-xl font-semibold text-ink">Re-enter your password to unlock</h2>
      {user?.username && (
        <p className="m-0 text-sm text-ink-soft">Signed in as <span className="font-medium text-ink">{user.username}</span></p>
      )}
      <p className="m-0 text-sm text-ink-soft text-center max-w-xs">Your session is still active, but the encryption key needs to be restored.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-[280px]">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="px-3 py-2.5 rounded border border-line text-base focus:outline-none focus:border-brand"
        />
        {error && <p className="m-0 text-danger text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="py-2.5 rounded border-none bg-brand text-white text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-brand-hover"
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
        <button
          type="button"
          onClick={logout}
          className="bg-transparent border-none text-ink-soft cursor-pointer text-sm hover:text-ink"
        >
          Sign out instead
        </button>
      </form>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading, needsKeyRestore } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-ink-soft">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (needsKeyRestore) {
    return <UnlockScreen />;
  }

  return children;
}

export default ProtectedRoute;
