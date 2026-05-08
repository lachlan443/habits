import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function UnlockScreen() {
  const { unlockWithPassword, logout } = useAuth();
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
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', flexDirection: 'column', gap: '16px'
    }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Re-enter your password to unlock</h2>
      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Your session is still active, but the encryption key needs to be restored.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
        />
        {error && <p style={{ margin: 0, color: '#e53e3e', fontSize: '0.875rem' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            padding: '10px', borderRadius: '6px', border: 'none',
            background: '#3182ce', color: 'white', fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
        <button
          type="button"
          onClick={logout}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.875rem' }}
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>
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
