import api from './api';

export const habitService = {
  async getHabits(includeArchived = false) {
    const response = await api.get('/habits', {
      params: { include_archived: includeArchived }
    });
    return response.data.habits;
  },

  async getHabit(id) {
    const response = await api.get(`/habits/${id}`);
    return response.data.habit;
  },

  async createHabit(data) {
    const response = await api.post('/habits', data);
    return response.data.habit;
  },

  async updateHabit(id, data) {
    const response = await api.put(`/habits/${id}`, data);
    return response.data.habit;
  },

  async deleteHabit(id) {
    await api.delete(`/habits/${id}`);
  },

  async getHabitStats(id) {
    const response = await api.get(`/habits/${id}/stats`);
    return response.data;
  }
};
