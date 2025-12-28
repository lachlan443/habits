import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { getTimezoneList } from '../../utils/timezoneUtils';
import './SettingsView.css';

function SettingsView() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Australia/Sydney');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const timezones = getTimezoneList();

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (!timezone) {
      setError('Timezone cannot be empty');
      return;
    }

    try {
      // Check what changed and update accordingly
      const usernameChanged = username !== user?.username;
      const timezoneChanged = timezone !== user?.timezone;

      if (usernameChanged && timezoneChanged) {
        await Promise.all([
          authService.updateUsername(username),
          authService.updateTimezone(timezone)
        ]);
        updateUser({ ...user, username, timezone });
        setSuccess('Account updated successfully. Please refresh the page to see timezone changes.');
      } else if (usernameChanged) {
        await authService.updateUsername(username);
        updateUser({ ...user, username });
        setSuccess('Username updated successfully');
      } else if (timezoneChanged) {
        await authService.updateTimezone(timezone);
        updateUser({ ...user, timezone });
        setSuccess('Timezone updated successfully. Please refresh the page to see changes.');
      } else {
        setSuccess('No changes to save');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update account');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await authService.changePassword(newPassword);
      setSuccess('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authService.deleteAccount();
      logout();
      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete account');
    }
  };

  return (
    <div className="settings-view">
      <Header />

      <div className="settings-content">
        <h2>Settings</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="settings-section">
          <div className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="section-content">
            <h3>Account</h3>
            <p className="section-description">Manage your account</p>

            <form onSubmit={handleUpdateAccount}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
              </div>
              <div className="form-group">
                <label>Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-save">Save</button>
            </form>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-content">
            <h3>Change your password</h3>

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <button type="submit" className="btn-save">Save</button>
            </form>
          </div>
        </div>

        <div className="settings-section danger-zone">
          <div className="section-content">
            <h3>Delete Account</h3>
            <p className="section-description">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                className="btn-delete"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </button>
            ) : (
              <div className="delete-confirm">
                <p>Are you sure? This will permanently delete all your habits and data.</p>
                <div className="confirm-actions">
                  <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </button>
                  <button className="btn-delete-confirm" onClick={handleDeleteAccount}>
                    Yes, Delete Everything
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
