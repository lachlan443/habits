import api from './api';

export const authService = {
  async signup(username, password, timezone, encryptionSalt, encryptedMasterKey) {
    const response = await api.post('/auth/signup', {
      username, password, timezone,
      encryption_salt: encryptionSalt,
      encrypted_master_key: encryptedMasterKey
    });
    return response.data;
  },

  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async getKey() {
    const response = await api.get('/auth/key');
    return response.data;
  },

  async updateUsername(username) {
    const response = await api.put('/auth/username', { username });
    return response.data;
  },

  async updateTimezone(timezone) {
    const response = await api.put('/auth/timezone', { timezone });
    return response.data;
  },

  async changePassword(oldPassword, newPassword, newEncryptionSalt, newEncryptedMasterKey) {
    const response = await api.put('/auth/password', {
      old_password: oldPassword,
      new_password: newPassword,
      new_encryption_salt: newEncryptionSalt,
      new_encrypted_master_key: newEncryptedMasterKey
    });
    return response.data;
  },

  async deleteAccount() {
    await api.delete('/auth/account');
  }
};
