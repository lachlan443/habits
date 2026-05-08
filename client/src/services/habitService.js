import api from './api';
import { encryptHabitName, decryptHabitName } from './encryption';

async function decryptHabits(habits, masterKey) {
  return Promise.all(habits.map(async (habit) => ({
    ...habit,
    name: await decryptHabitName(habit.name, masterKey)
  })));
}

export const habitService = {
  async getHabits(masterKey, includeArchived = false) {
    const response = await api.get('/habits', { params: { include_archived: includeArchived } });
    return decryptHabits(response.data.habits, masterKey);
  },

  async getHabit(masterKey, id) {
    const response = await api.get(`/habits/${id}`);
    const habit = response.data.habit;
    return { ...habit, name: await decryptHabitName(habit.name, masterKey) };
  },

  async createHabit(masterKey, data) {
    const encryptedName = await encryptHabitName(data.name, masterKey);
    const response = await api.post('/habits', { ...data, name: encryptedName });
    return { ...response.data.habit, name: data.name };
  },

  async updateHabit(masterKey, id, data) {
    const payload = { ...data };
    if (data.name !== undefined) {
      payload.name = await encryptHabitName(data.name, masterKey);
    }
    const response = await api.put(`/habits/${id}`, payload);
    const habit = response.data.habit;
    if (data.name !== undefined) {
      return { ...habit, name: data.name };
    }
    return { ...habit, name: await decryptHabitName(habit.name, masterKey) };
  },

  async deleteHabit(id) {
    await api.delete(`/habits/${id}`);
  },

  async getHabitStats(id) {
    const response = await api.get(`/habits/${id}/stats`);
    return response.data;
  }
};
