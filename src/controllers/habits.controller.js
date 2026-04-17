const db = require('../config/database');
const { calculateStreaks, calculateCompletionRate } = require('../utils/streakCalculator');
const { encrypt, decrypt } = require('../services/encryptionService');

function decryptHabit(habit, key) {
  if (!habit) return habit;
  return {
    ...habit,
    name: decrypt(habit.name, key),
    frequency_days: habit.frequency_days ? JSON.parse(decrypt(habit.frequency_days, key)) : null,
    archived: Boolean(habit.archived)
  };
}

function requireKey(req, res) {
  if (!req.encryptionKey) {
    res.status(401).json({ error: 'Missing encryption key — please log in again' });
    return false;
  }
  return true;
}

function getHabits(req, res) {
  if (!requireKey(req, res)) return;
  const userId = req.userId;
  const key = req.encryptionKey;
  const includeArchived = req.query.include_archived === 'true';

  let query = 'SELECT * FROM habits WHERE user_id = ?';
  const params = [userId];

  if (!includeArchived) {
    query += ' AND archived = 0';
  }

  query += ' ORDER BY order_index, created_at';

  db.all(query, params, (err, habits) => {
    if (err) {
      console.error('Get habits error:', err);
      return res.status(500).json({ error: 'Failed to fetch habits' });
    }

    try {
      res.json({ habits: habits.map(h => decryptHabit(h, key)) });
    } catch (e) {
      console.error('Decrypt habits error:', e);
      res.status(500).json({ error: 'Failed to decrypt habits' });
    }
  });
}

function getHabit(req, res) {
  if (!requireKey(req, res)) return;
  const userId = req.userId;
  const key = req.encryptionKey;
  const habitId = req.params.id;

  db.get(
    'SELECT * FROM habits WHERE id = ? AND user_id = ?',
    [habitId, userId],
    (err, habit) => {
      if (err) {
        console.error('Get habit error:', err);
        return res.status(500).json({ error: 'Failed to fetch habit' });
      }

      if (!habit) {
        return res.status(404).json({ error: 'Habit not found' });
      }

      try {
        res.json({ habit: decryptHabit(habit, key) });
      } catch (e) {
        console.error('Decrypt habit error:', e);
        res.status(500).json({ error: 'Failed to decrypt habit' });
      }
    }
  );
}

function createHabit(req, res) {
  if (!requireKey(req, res)) return;
  const userId = req.userId;
  const key = req.encryptionKey;
  const { name, color, frequency_type, frequency_days } = req.body;

  if (!name || !color || !frequency_type) {
    return res.status(400).json({
      error: 'Name, color, and frequency_type are required'
    });
  }

  if (!['daily', 'custom'].includes(frequency_type)) {
    return res.status(400).json({
      error: 'frequency_type must be "daily" or "custom"'
    });
  }

  if (frequency_type === 'custom' && (!frequency_days || !Array.isArray(frequency_days))) {
    return res.status(400).json({
      error: 'frequency_days array is required for custom frequency'
    });
  }

  const encryptedName = encrypt(name, key);
  const encryptedFrequencyDays = frequency_days ? encrypt(JSON.stringify(frequency_days), key) : null;

  db.run(
    `INSERT INTO habits (user_id, name, color, frequency_type, frequency_days)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, encryptedName, color, frequency_type, encryptedFrequencyDays],
    function(err) {
      if (err) {
        console.error('Create habit error:', err);
        return res.status(500).json({ error: 'Failed to create habit' });
      }

      const habitId = this.lastID;

      db.get(
        'SELECT * FROM habits WHERE id = ?',
        [habitId],
        (err, habit) => {
          if (err) {
            console.error('Fetch created habit error:', err);
            return res.status(500).json({ error: 'Failed to fetch created habit' });
          }

          res.status(201).json({ habit: decryptHabit(habit, key) });
        }
      );
    }
  );
}

function updateHabit(req, res) {
  if (!requireKey(req, res)) return;
  const userId = req.userId;
  const key = req.encryptionKey;
  const habitId = req.params.id;
  const { name, color, frequency_type, frequency_days, archived, order_index } = req.body;

  db.get(
    'SELECT * FROM habits WHERE id = ? AND user_id = ?',
    [habitId, userId],
    (err, habit) => {
      if (err) {
        console.error('Check habit error:', err);
        return res.status(500).json({ error: 'Failed to update habit' });
      }

      if (!habit) {
        return res.status(404).json({ error: 'Habit not found' });
      }

      const updates = [];
      const params = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(encrypt(name, key));
      }

      if (color !== undefined) {
        updates.push('color = ?');
        params.push(color);
      }

      if (frequency_type !== undefined) {
        updates.push('frequency_type = ?');
        params.push(frequency_type);
      }

      if (frequency_days !== undefined) {
        updates.push('frequency_days = ?');
        params.push(frequency_days ? encrypt(JSON.stringify(frequency_days), key) : null);
      }

      if (archived !== undefined) {
        updates.push('archived = ?');
        params.push(archived ? 1 : 0);
      }

      if (order_index !== undefined) {
        updates.push('order_index = ?');
        params.push(order_index);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      if (updates.length === 1) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(habitId, userId);

      const query = `UPDATE habits SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

      db.run(query, params, function(err) {
        if (err) {
          console.error('Update habit error:', err);
          return res.status(500).json({ error: 'Failed to update habit' });
        }

        db.get(
          'SELECT * FROM habits WHERE id = ?',
          [habitId],
          (err, updatedHabit) => {
            if (err) {
              console.error('Fetch updated habit error:', err);
              return res.status(500).json({ error: 'Failed to fetch updated habit' });
            }

            res.json({ habit: decryptHabit(updatedHabit, key) });
          }
        );
      });
    }
  );
}

function deleteHabit(req, res) {
  const userId = req.userId;
  const habitId = req.params.id;

  db.run(
    'DELETE FROM habits WHERE id = ? AND user_id = ?',
    [habitId, userId],
    function(err) {
      if (err) {
        console.error('Delete habit error:', err);
        return res.status(500).json({ error: 'Failed to delete habit' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Habit not found' });
      }

      res.json({ message: 'Habit deleted successfully' });
    }
  );
}

function getHabitStats(req, res) {
  if (!requireKey(req, res)) return;
  const userId = req.userId;
  const key = req.encryptionKey;
  const habitId = req.params.id;

  db.get(
    'SELECT timezone FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Get user timezone error:', err);
        return res.status(500).json({ error: 'Failed to fetch user info' });
      }

      const userTimezone = user?.timezone || 'Australia/Sydney';

      db.get(
        'SELECT * FROM habits WHERE id = ? AND user_id = ?',
        [habitId, userId],
        (err, habit) => {
          if (err) {
            console.error('Get habit error:', err);
            return res.status(500).json({ error: 'Failed to fetch habit stats' });
          }

          if (!habit) {
            return res.status(404).json({ error: 'Habit not found' });
          }

          let decryptedHabit;
          try {
            decryptedHabit = decryptHabit(habit, key);
          } catch (e) {
            console.error('Decrypt habit stats error:', e);
            return res.status(500).json({ error: 'Failed to decrypt habit' });
          }

          db.all(
            'SELECT * FROM completions WHERE habit_id = ? ORDER BY date',
            [habitId],
            (err, completions) => {
              if (err) {
                console.error('Get completions error:', err);
                return res.status(500).json({ error: 'Failed to fetch habit stats' });
              }

              const { currentStreak, longestStreak } = calculateStreaks(decryptedHabit, completions, userTimezone);
              const completionRate = calculateCompletionRate(decryptedHabit, completions, userTimezone);
              const totalCompletions = completions.filter(c => c.status === 'completed').length;

              const completionsByDate = {};
              completions.forEach(c => {
                completionsByDate[c.date] = c.status;
              });

              res.json({
                current_streak: currentStreak,
                longest_streak: longestStreak,
                total_completions: totalCompletions,
                completion_rate: completionRate,
                completions_by_date: completionsByDate
              });
            }
          );
        }
      );
    }
  );
}

module.exports = {
  getHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitStats
};
