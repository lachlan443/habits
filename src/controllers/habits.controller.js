const db = require('../config/database');
const { calculateStreaks, calculateCompletionRate } = require('../utils/streakCalculator');

const MAX_NAME_BYTES = 512;

function formatHabit(habit) {
  return {
    ...habit,
    frequency_days: habit.frequency_days ? JSON.parse(habit.frequency_days) : null,
    archived: Boolean(habit.archived)
  };
}

function getHabits(req, res) {
  const includeArchived = req.query.include_archived === 'true';
  let query = 'SELECT * FROM habits WHERE user_id = ?';
  const params = [req.userId];
  if (!includeArchived) query += ' AND archived = 0';
  query += ' ORDER BY order_index, created_at LIMIT 500';

  db.all(query, params, (err, habits) => {
    if (err) {
      console.error('Get habits error:', err);
      return res.status(500).json({ error: 'Failed to fetch habits' });
    }
    res.json({ habits: habits.map(formatHabit) });
  });
}

function getHabit(req, res) {
  db.get(
    'SELECT * FROM habits WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    (err, habit) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch habit' });
      if (!habit) return res.status(404).json({ error: 'Habit not found' });
      res.json({ habit: formatHabit(habit) });
    }
  );
}

function createHabit(req, res) {
  const { name, color, frequency_type, frequency_days } = req.body;

  if (!name || !color || !frequency_type) {
    return res.status(400).json({ error: 'Name, color, and frequency_type are required' });
  }
  if (!['daily', 'custom'].includes(frequency_type)) {
    return res.status(400).json({ error: 'frequency_type must be "daily" or "custom"' });
  }
  if (frequency_type === 'custom' && (!frequency_days || !Array.isArray(frequency_days))) {
    return res.status(400).json({ error: 'frequency_days array is required for custom frequency' });
  }
  if (Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES) {
    return res.status(400).json({ error: 'Invalid habit data' });
  }

  const freqDaysJson = frequency_days ? JSON.stringify(frequency_days) : null;

  db.run(
    'INSERT INTO habits (user_id, name, color, frequency_type, frequency_days) VALUES (?, ?, ?, ?, ?)',
    [req.userId, name, color, frequency_type, freqDaysJson],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to create habit' });
      db.get('SELECT * FROM habits WHERE id = ?', [this.lastID], (err, habit) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch created habit' });
        res.status(201).json({ habit: formatHabit(habit) });
      });
    }
  );
}

function updateHabit(req, res) {
  const { name, color, frequency_type, frequency_days, archived, order_index } = req.body;

  db.get('SELECT * FROM habits WHERE id = ? AND user_id = ?', [req.params.id, req.userId], (err, habit) => {
    if (err) return res.status(500).json({ error: 'Failed to update habit' });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    if (name !== undefined && Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES) {
      return res.status(400).json({ error: 'Invalid habit data' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (color !== undefined) { updates.push('color = ?'); params.push(color); }
    if (frequency_type !== undefined) { updates.push('frequency_type = ?'); params.push(frequency_type); }
    if (frequency_days !== undefined) {
      updates.push('frequency_days = ?');
      params.push(frequency_days ? JSON.stringify(frequency_days) : null);
    }
    if (archived !== undefined) { updates.push('archived = ?'); params.push(archived ? 1 : 0); }
    if (order_index !== undefined) { updates.push('order_index = ?'); params.push(order_index); }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    if (updates.length === 1) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id, req.userId);
    db.run(
      `UPDATE habits SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params,
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update habit' });
        db.get('SELECT * FROM habits WHERE id = ?', [req.params.id], (err, updated) => {
          if (err) return res.status(500).json({ error: 'Failed to fetch updated habit' });
          res.json({ habit: formatHabit(updated) });
        });
      }
    );
  });
}

function deleteHabit(req, res) {
  db.run('DELETE FROM habits WHERE id = ? AND user_id = ?', [req.params.id, req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete habit' });
    if (this.changes === 0) return res.status(404).json({ error: 'Habit not found' });
    res.json({ message: 'Habit deleted successfully' });
  });
}

function getHabitStats(req, res) {
  db.get('SELECT timezone FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch user info' });
    const userTimezone = user?.timezone || 'Australia/Sydney';

    db.get('SELECT * FROM habits WHERE id = ? AND user_id = ?', [req.params.id, req.userId], (err, habit) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch habit stats' });
      if (!habit) return res.status(404).json({ error: 'Habit not found' });

      const formattedHabit = formatHabit(habit);

      db.all('SELECT * FROM completions WHERE habit_id = ? ORDER BY date', [req.params.id], (err, completions) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch habit stats' });

        const { currentStreak, longestStreak } = calculateStreaks(formattedHabit, completions, userTimezone);
        const completionRate = calculateCompletionRate(formattedHabit, completions, userTimezone);
        const totalCompletions = completions.filter(c => c.status === 'completed').length;

        const completionsByDate = {};
        completions.forEach(c => { completionsByDate[c.date] = c.status; });

        res.json({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          total_completions: totalCompletions,
          completion_rate: completionRate,
          completions_by_date: completionsByDate
        });
      });
    });
  });
}

module.exports = { getHabits, getHabit, createHabit, updateHabit, deleteHabit, getHabitStats };
