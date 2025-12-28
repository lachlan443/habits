const db = require('../config/database');

// Get completions for a date range
function getCompletions(req, res) {
  const userId = req.userId;
  const { start_date, end_date, habit_id } = req.query;

  // Build query
  let query = `
    SELECT c.* FROM completions c
    JOIN habits h ON c.habit_id = h.id
    WHERE h.user_id = ?
  `;
  const params = [userId];

  if (start_date) {
    query += ' AND c.date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND c.date <= ?';
    params.push(end_date);
  }

  if (habit_id) {
    query += ' AND c.habit_id = ?';
    params.push(habit_id);
  }

  query += ' ORDER BY c.date DESC';

  db.all(query, params, (err, completions) => {
    if (err) {
      console.error('Get completions error:', err);
      return res.status(500).json({ error: 'Failed to fetch completions' });
    }

    res.json({ completions });
  });
}

// Create or update a completion
function createCompletion(req, res) {
  const userId = req.userId;
  const { habit_id, date, status } = req.body;

  // Validation
  if (!habit_id || !date || !status) {
    return res.status(400).json({
      error: 'habit_id, date, and status are required'
    });
  }

  if (!['completed', 'skipped'].includes(status)) {
    return res.status(400).json({
      error: 'status must be "completed" or "skipped"'
    });
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: 'date must be in YYYY-MM-DD format'
    });
  }

  // Check if habit exists and belongs to user
  db.get(
    'SELECT * FROM habits WHERE id = ? AND user_id = ?',
    [habit_id, userId],
    (err, habit) => {
      if (err) {
        console.error('Check habit error:', err);
        return res.status(500).json({ error: 'Failed to create completion' });
      }

      if (!habit) {
        return res.status(404).json({ error: 'Habit not found' });
      }

      // Check if completion already exists
      db.get(
        'SELECT * FROM completions WHERE habit_id = ? AND date = ?',
        [habit_id, date],
        (err, existingCompletion) => {
          if (err) {
            console.error('Check existing completion error:', err);
            return res.status(500).json({ error: 'Failed to create completion' });
          }

          const isUpdate = !!existingCompletion;

          // Use INSERT OR REPLACE to handle duplicates
          db.run(
            `INSERT INTO completions (habit_id, date, status)
             VALUES (?, ?, ?)
             ON CONFLICT(habit_id, date)
             DO UPDATE SET status = ?, updated_at = CURRENT_TIMESTAMP`,
            [habit_id, date, status, status],
            function(err) {
              if (err) {
                console.error('Create completion error:', err);
                return res.status(500).json({ error: 'Failed to create completion' });
              }

              // Fetch the created/updated completion
              db.get(
                'SELECT * FROM completions WHERE habit_id = ? AND date = ?',
                [habit_id, date],
                (err, completion) => {
                  if (err) {
                    console.error('Fetch completion error:', err);
                    return res.status(500).json({ error: 'Failed to fetch completion' });
                  }

                  // Return 200 for update, 201 for create
                  res.status(isUpdate ? 200 : 201).json({ completion });
                }
              );
            }
          );
        }
      );
    }
  );
}

// Delete a completion by ID
function deleteCompletion(req, res) {
  const userId = req.userId;
  const completionId = req.params.id;

  // Check if completion belongs to user's habit
  db.get(
    `SELECT c.* FROM completions c
     JOIN habits h ON c.habit_id = h.id
     WHERE c.id = ? AND h.user_id = ?`,
    [completionId, userId],
    (err, completion) => {
      if (err) {
        console.error('Check completion error:', err);
        return res.status(500).json({ error: 'Failed to delete completion' });
      }

      if (!completion) {
        return res.status(404).json({ error: 'Completion not found' });
      }

      db.run(
        'DELETE FROM completions WHERE id = ?',
        [completionId],
        function(err) {
          if (err) {
            console.error('Delete completion error:', err);
            return res.status(500).json({ error: 'Failed to delete completion' });
          }

          res.status(204).send();
        }
      );
    }
  );
}

// Delete a completion by habit_id and date
function deleteCompletionByDate(req, res) {
  const userId = req.userId;
  const { habit_id, date } = req.body;

  console.log('DELETE /completions/by-date called with:', { habit_id, date, userId });

  if (!habit_id || !date) {
    return res.status(400).json({
      error: 'habit_id and date are required'
    });
  }

  // Check if habit belongs to user
  db.get(
    'SELECT * FROM habits WHERE id = ? AND user_id = ?',
    [habit_id, userId],
    (err, habit) => {
      if (err) {
        console.error('Check habit error:', err);
        return res.status(500).json({ error: 'Failed to delete completion' });
      }

      if (!habit) {
        console.log('Habit not found for id:', habit_id, 'user:', userId);
        return res.status(404).json({ error: 'Habit not found' });
      }

      console.log('Habit found, attempting to delete completion...');

      // First check if completion exists
      db.get(
        'SELECT * FROM completions WHERE habit_id = ? AND date = ?',
        [habit_id, date],
        (err, existing) => {
          if (err) {
            console.error('Check completion error:', err);
          } else {
            console.log('Existing completion:', existing);
          }

          db.run(
            'DELETE FROM completions WHERE habit_id = ? AND date = ?',
            [habit_id, date],
            function(err) {
              if (err) {
                console.error('Delete completion error:', err);
                return res.status(500).json({ error: 'Failed to delete completion' });
              }

              console.log('Delete result - changes:', this.changes);

              if (this.changes === 0) {
                return res.status(404).json({ error: 'Completion not found' });
              }

              res.status(204).send();
            }
          );
        }
      );
    }
  );
}

// Get total count of completed habits for the user
function getTotalCompletions(req, res) {
  const userId = req.userId;

  db.get(
    `SELECT COUNT(*) as total FROM completions c
     JOIN habits h ON c.habit_id = h.id
     WHERE h.user_id = ? AND c.status = 'completed'`,
    [userId],
    (err, result) => {
      if (err) {
        console.error('Get total completions error:', err);
        return res.status(500).json({ error: 'Failed to fetch total completions' });
      }

      res.json({ total: result.total });
    }
  );
}

module.exports = {
  getCompletions,
  createCompletion,
  deleteCompletion,
  deleteCompletionByDate,
  getTotalCompletions
};
