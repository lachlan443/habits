const db = require('../config/database');
const { hashPassword, verifyPassword, generateToken } = require('../services/authService');

// Signup
async function signup(req, res) {
  const { username, password, timezone } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (!timezone) {
    return res.status(400).json({ error: 'Timezone is required' });
  }

  if (typeof timezone !== 'string' || timezone.length < 3) {
    return res.status(400).json({ error: 'Invalid timezone format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    const passwordHash = await hashPassword(password);

    db.run(
      'INSERT INTO users (username, password_hash, timezone) VALUES (?, ?, ?)',
      [username, passwordHash, timezone],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          console.error('Signup error:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }

        const userId = this.lastID;
        const token = generateToken(userId);

        res.status(201).json({
          user: { id: userId, username, timezone },
          token
        });
      }
    );
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

// Login
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT id, username, password_hash, timezone FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      try {
        const isValid = await verifyPassword(password, user.password_hash);

        if (!isValid) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = generateToken(user.id);

        res.json({
          user: {
            id: user.id,
            username: user.username,
            timezone: user.timezone || 'Australia/Sydney'
          },
          token
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    }
  );
}

// Get current user
function getMe(req, res) {
  const userId = req.userId; // Set by auth middleware

  db.get(
    'SELECT id, username, timezone, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('GetMe error:', err);
        return res.status(500).json({ error: 'Failed to get user' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: {
          ...user,
          timezone: user.timezone || 'Australia/Sydney'
        }
      });
    }
  );
}

// Logout (optional, mainly client-side action)
function logout(req, res) {
  // In a more complex system, we could invalidate the token here
  res.json({ message: 'Logged out successfully' });
}

// Update username
function updateUsername(req, res) {
  const userId = req.userId;
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  db.run(
    'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [username.trim(), userId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('Update username error:', err);
        return res.status(500).json({ error: 'Failed to update username' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'Username updated successfully', username: username.trim() });
    }
  );
}

// Change password
async function changePassword(req, res) {
  const userId = req.userId;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const passwordHash = await hashPassword(password);

    db.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId],
      function(err) {
        if (err) {
          console.error('Change password error:', err);
          return res.status(500).json({ error: 'Failed to change password' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Password changed successfully' });
      }
    );
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

// Update timezone
function updateTimezone(req, res) {
  const userId = req.userId;
  const { timezone } = req.body;

  if (!timezone || !timezone.trim()) {
    return res.status(400).json({ error: 'Timezone is required' });
  }

  if (typeof timezone !== 'string' || timezone.length < 3) {
    return res.status(400).json({ error: 'Invalid timezone format' });
  }

  db.run(
    'UPDATE users SET timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [timezone.trim(), userId],
    function(err) {
      if (err) {
        console.error('Update timezone error:', err);
        return res.status(500).json({ error: 'Failed to update timezone' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'Timezone updated successfully', timezone: timezone.trim() });
    }
  );
}

// Delete account
function deleteAccount(req, res) {
  const userId = req.userId;

  // First, delete all user's habits (cascading will handle completions)
  db.run('DELETE FROM habits WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('Delete habits error:', err);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    // Then delete the user
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('Delete user error:', err);
        return res.status(500).json({ error: 'Failed to delete account' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'Account deleted successfully' });
    });
  });
}

module.exports = {
  signup,
  login,
  getMe,
  logout,
  updateUsername,
  updateTimezone,
  changePassword,
  deleteAccount
};
