import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { getTimezoneList } from '../../utils/timezoneUtils';

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

  const fieldLabelClass = "block mb-1.5 text-ink-muted text-sm font-medium";
  const inputClass = "w-full px-3 py-2.5 border border-line rounded text-sm box-border transition-colors focus:outline-none focus:border-brand";
  const sectionClass = "bg-white rounded-sm p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] mb-4";
  const btnSave = "px-5 py-2.5 bg-brand text-white border-none rounded text-sm font-medium cursor-pointer transition-colors hover:bg-brand-hover";

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-[700px] mx-auto p-6">
        <h2 className="m-0 mb-6 text-2xl font-semibold text-ink">Settings</h2>

        {error && (
          <div className="bg-danger-bg text-danger-text px-3 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-brand-tint text-brand px-3 py-3 rounded mb-4 text-sm">
            {success}
          </div>
        )}

        <div className={sectionClass}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 flex-shrink-0 text-brand">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="m-0 text-lg font-semibold text-ink">Account</h3>
              <p className="mt-1 mb-4 text-sm text-ink-soft">Manage your account</p>

              <form onSubmit={handleUpdateAccount}>
                <div className="mb-4">
                  <label className={fieldLabelClass}>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className={inputClass}
                  />
                </div>
                <div className="mb-4">
                  <label className={fieldLabelClass}>Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={`${inputClass} bg-white cursor-pointer`}
                  >
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className={btnSave}>Save</button>
              </form>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className="m-0 mb-4 text-lg font-semibold text-ink">Change your password</h3>

          <form onSubmit={handleChangePassword}>
            <div className="mb-4">
              <label className={fieldLabelClass}>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={inputClass}
              />
            </div>
            <div className="mb-4">
              <label className={fieldLabelClass}>Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={inputClass}
              />
            </div>
            <button type="submit" className={btnSave}>Save</button>
          </form>
        </div>

        <div className={`${sectionClass} border border-danger/30`}>
          <h3 className="m-0 mb-1 text-lg font-semibold text-danger">Delete Account</h3>
          <p className="mt-1 mb-4 text-sm text-ink-soft">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              className="px-5 py-2.5 bg-danger text-white border-none rounded text-sm cursor-pointer transition-colors hover:bg-[#D32F2F]"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </button>
          ) : (
            <div>
              <p className="text-sm text-ink-muted mb-3">Are you sure? This will permanently delete all your habits and data.</p>
              <div className="flex gap-2">
                <button
                  className="px-5 py-2.5 bg-white text-ink-soft border border-line rounded text-sm cursor-pointer transition-all hover:bg-surface-hover hover:border-line-dark"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 bg-[#D32F2F] text-white border-none rounded text-sm font-semibold cursor-pointer animate-pop"
                  onClick={handleDeleteAccount}
                >
                  Yes, Delete Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
