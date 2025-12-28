const db = require('../config/database');
const { calculateStreaks, calculateCompletionRate } = require('../utils/streakCalculator');

// Get all habits for the current user
function getHabits(req, res) {
  const userId = req.userId;
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

    // Parse frequency_days JSON
    const parsedHabits = habits.map(habit => ({
      ...habit,
      frequency_days: habit.frequency_days ? JSON.parse(habit.frequency_days) : null,
      archived: Boolean(habit.archived)
    }));

    res.json({ habits: parsedHabits });
  });
}

// Get a single habit
function getHabit(req, res) {
  const userId = req.userId;
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

      // Parse frequency_days JSON
      habit.frequency_days = habit.frequency_days ? JSON.parse(habit.frequency_days) : null;
      habit.archived = Boolean(habit.archived);

      res.json({ habit });
    }
  );
}

// Create a new habit
function createHabit(req, res) {
  const userId = req.userId;
  const { name, color, frequency_type, frequency_days } = req.body;

  // Validation
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

  const frequencyDaysJson = frequency_days ? JSON.stringify(frequency_days) : null;

  db.run(
    `INSERT INTO habits (user_id, name, color, frequency_type, frequency_days)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, name, color, frequency_type, frequencyDaysJson],
    function(err) {
      if (err) {
        console.error('Create habit error:', err);
        return res.status(500).json({ error: 'Failed to create habit' });
      }

      const habitId = this.lastID;

      // Fetch the created habit
      db.get(
        'SELECT * FROM habits WHERE id = ?',
        [habitId],
        (err, habit) => {
          if (err) {
            console.error('Fetch created habit error:', err);
            return res.status(500).json({ error: 'Failed to fetch created habit' });
          }

          habit.frequency_days = habit.frequency_days ? JSON.parse(habit.frequency_days) : null;
          habit.archived = Boolean(habit.archived);

          res.status(201).json({ habit });
        }
      );
    }
  );
}

// Update a habit
function updateHabit(req, res) {
  const userId = req.userId;
  const habitId = req.params.id;
  const { name, color, frequency_type, frequency_days, archived, order_index } = req.body;

  // First check if habit exists and belongs to user
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

      // Build update query dynamically
      const updates = [];
      const params = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
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
        params.push(frequency_days ? JSON.stringify(frequency_days) : null);
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
        // Only updated_at would be updated
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(habitId, userId);

      const query = `UPDATE habits SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

      db.run(query, params, function(err) {
        if (err) {
          console.error('Update habit error:', err);
          return res.status(500).json({ error: 'Failed to update habit' });
        }

        // Fetch updated habit
        db.get(
          'SELECT * FROM habits WHERE id = ?',
          [habitId],
          (err, updatedHabit) => {
            if (err) {
              console.error('Fetch updated habit error:', err);
              return res.status(500).json({ error: 'Failed to fetch updated habit' });
            }

            updatedHabit.frequency_days = updatedHabit.frequency_days
              ? JSON.parse(updatedHabit.frequency_days)
              : null;
            updatedHabit.archived = Boolean(updatedHabit.archived);

            res.json({ habit: updatedHabit });
          }
        );
      });
    }
  );
}

// Delete a habit
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

// Get habit statistics
function getHabitStats(req, res) {
  const userId = req.userId;
  const habitId = req.params.id;

  // Get user's timezone first
  db.get(
    'SELECT timezone FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Get user timezone error:', err);
        return res.status(500).json({ error: 'Failed to fetch user info' });
      }

      const userTimezone = user?.timezone || 'Australia/Sydney';

      // Get habit
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

          // Parse frequency_days
          habit.frequency_days = habit.frequency_days ? JSON.parse(habit.frequency_days) : null;

          // Get all completions for this habit
          db.all(
            'SELECT * FROM completions WHERE habit_id = ? ORDER BY date',
            [habitId],
            (err, completions) => {
              if (err) {
                console.error('Get completions error:', err);
                return res.status(500).json({ error: 'Failed to fetch habit stats' });
              }

              // Calculate statistics with user timezone
              const { currentStreak, longestStreak } = calculateStreaks(habit, completions, userTimezone);
              const completionRate = calculateCompletionRate(habit, completions, userTimezone);
              const totalCompletions = completions.filter(c => c.status === 'completed').length;

              // Build completions by date object
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
