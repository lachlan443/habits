import api from './api';

export const completionService = {
  async getCompletions(startDate, endDate, habitId = null) {
    const params = {
      start_date: startDate,
      end_date: endDate
    };
    if (habitId) {
      params.habit_id = habitId;
    }
    const response = await api.get('/completions', { params });
    return response.data.completions;
  },

  async createCompletion(data) {
    const response = await api.post('/completions', data);
    return response.data.completion;
  },

  async deleteCompletion(id) {
    await api.delete(`/completions/${id}`);
  },

  async deleteCompletionByDate(habitId, date) {
    await api.delete('/completions/by-date', {
      data: { habit_id: habitId, date }
    });
  },

  async getTotalCompletions() {
    const response = await api.get('/completions/total');
    return response.data.total;
  }
};
