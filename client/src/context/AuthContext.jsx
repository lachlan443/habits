import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import {
  generateSalt,
  generateMasterKey,
  derivePasswordKey,
  encryptMasterKey,
  decryptMasterKey,
  importRawKey
} from '../services/encryption';
import { writeCache, readCache, clearCache } from '../services/keyCache';
import { DEFAULT_PREFERENCES } from '../config/preferences';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [masterKey, setMasterKey] = useState(null);
  const [needsKeyRestore, setNeedsKeyRestore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const [meData, prefs] = await Promise.all([
        authService.getMe(),
        authService.getPreferences()
      ]);
      setUser(meData.user);
      setPreferences(prefs);
      const cachedKey = await readCache();
      if (cachedKey) {
        setMasterKey(cachedKey);
      } else {
        setNeedsKeyRestore(true);
      }
    } catch {
      // No active session — stay logged out
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    const passwordKey = await derivePasswordKey(password, data.encryption_salt);
    const masterKeyBytes = await decryptMasterKey(data.encrypted_master_key, passwordKey);
    const masterCryptoKey = await importRawKey(masterKeyBytes);
    await writeCache(masterCryptoKey);
    setMasterKey(masterCryptoKey);
    setUser(data.user);
    setNeedsKeyRestore(false);
    const prefs = await authService.getPreferences();
    setPreferences(prefs);
    return data;
  };

  const signup = async (username, password, timezone) => {
    const salt = generateSalt();
    const masterKeyBytes = generateMasterKey();
    const passwordKey = await derivePasswordKey(password, salt);
    const encryptedKey = await encryptMasterKey(masterKeyBytes, passwordKey);
    const data = await authService.signup(username, password, timezone, salt, encryptedKey);
    const masterCryptoKey = await importRawKey(masterKeyBytes);
    await writeCache(masterCryptoKey);
    setMasterKey(masterCryptoKey);
    setUser(data.user);
    setNeedsKeyRestore(false);
    const prefs = await authService.getPreferences();
    setPreferences(prefs);
    return data;
  };

  const logout = async () => {
    await authService.logout();
    await clearCache();
    setMasterKey(null);
    setUser(null);
    setPreferences(DEFAULT_PREFERENCES);
    setNeedsKeyRestore(false);
  };

  const updatePreferences = async (patch) => {
    const updated = await authService.updatePreferences(patch);
    setPreferences(updated);
    return updated;
  };

  const unlockWithPassword = async (password) => {
    const keyData = await authService.getKey();
    const passwordKey = await derivePasswordKey(password, keyData.encryption_salt);
    const masterKeyBytes = await decryptMasterKey(keyData.encrypted_master_key, passwordKey);
    const masterCryptoKey = await importRawKey(masterKeyBytes);
    await writeCache(masterCryptoKey);
    setMasterKey(masterCryptoKey);
    setNeedsKeyRestore(false);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  const value = {
    user,
    masterKey,
    needsKeyRestore,
    loading,
    login,
    signup,
    logout,
    unlockWithPassword,
    updateUser,
    preferences,
    updatePreferences,
    timezone: user?.timezone || 'Australia/Sydney'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
