import api, { setAuthToken } from './api';

export const authService = {
  async signup(username, password, timezone) {
    const response = await api.post('/auth/signup', { username, password, timezone });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    setAuthToken(null);
  },

  async getMe() {
    const response = await api.get('/auth/me');
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

  async changePassword(newPassword) {
    const response = await api.put('/auth/password', { password: newPassword });
    return response.data;
  },

  async deleteAccount() {
    await api.delete('/auth/account');
    localStorage.removeItem('token');
    setAuthToken(null);
  }
};
