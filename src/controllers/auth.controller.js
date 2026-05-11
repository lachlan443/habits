const db = require('../config/database');
const { hashPassword, verifyPassword } = require('../services/authService');

async function signup(req, res) {
  const { username, password, timezone, encryption_salt, encrypted_master_key } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (!timezone || typeof timezone !== 'string' || timezone.length < 3) {
    return res.status(400).json({ error: 'Timezone is required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  if (!encryption_salt || !encrypted_master_key) {
    return res.status(400).json({ error: 'Encryption data is required' });
  }

  try {
    const passwordHash = await hashPassword(password);
    db.run(
      'INSERT INTO users (username, password_hash, timezone, encryption_salt, encrypted_master_key) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, timezone, encryption_salt, encrypted_master_key],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Could not create account' });
          }
          console.error('Signup error:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        const userId = this.lastID;
        req.session.regenerate((err) => {
          if (err) return res.status(500).json({ error: 'Failed to create session' });
          req.session.userId = userId;
          res.status(201).json({ user: { id: userId, username, timezone } });
        });
      }
    );
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT id, username, password_hash, timezone, encryption_salt, encrypted_master_key FROM users WHERE username = ?',
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
        req.session.regenerate((err) => {
          if (err) return res.status(500).json({ error: 'Login failed' });
          req.session.userId = user.id;
          res.json({
            user: { id: user.id, username: user.username, timezone: user.timezone || 'Australia/Sydney' },
            encryption_salt: user.encryption_salt,
            encrypted_master_key: user.encrypted_master_key
          });
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    }
  );
}

function getMe(req, res) {
  db.get(
    'SELECT id, username, timezone, created_at FROM users WHERE id = ?',
    [req.userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Failed to get user' });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { ...user, timezone: user.timezone || 'Australia/Sydney' } });
    }
  );
}

function getKey(req, res) {
  db.get(
    'SELECT encryption_salt, encrypted_master_key FROM users WHERE id = ?',
    [req.userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Failed to get key data' });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ encryption_salt: user.encryption_salt, encrypted_master_key: user.encrypted_master_key });
    }
  );
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('habits.sid');
    res.json({ message: 'Logged out successfully' });
  });
}

function updateUsername(req, res) {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  db.run(
    'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [username.trim(), req.userId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Failed to update username' });
      }
      res.json({ message: 'Username updated successfully', username: username.trim() });
    }
  );
}

function updateTimezone(req, res) {
  const { timezone } = req.body;
  if (!timezone || typeof timezone !== 'string' || timezone.length < 3) {
    return res.status(400).json({ error: 'Invalid timezone' });
  }
  db.run(
    'UPDATE users SET timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [timezone.trim(), req.userId],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update timezone' });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'Timezone updated successfully', timezone: timezone.trim() });
    }
  );
}

async function changePassword(req, res) {
  const { old_password, new_password, new_encryption_salt, new_encrypted_master_key } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Both old and new passwords are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  if (!new_encryption_salt || !new_encrypted_master_key) {
    return res.status(400).json({ error: 'Encryption data is required' });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [req.userId], async (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'Failed to change password' });

    try {
      const isValid = await verifyPassword(old_password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

      const newHash = await hashPassword(new_password);
      db.run(
        'UPDATE users SET password_hash = ?, encryption_salt = ?, encrypted_master_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newHash, new_encryption_salt, new_encrypted_master_key, req.userId],
        function(err) {
          if (err) return res.status(500).json({ error: 'Failed to change password' });
          res.json({ message: 'Password changed successfully' });
        }
      );
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });
}

function deleteAccount(req, res) {
  db.run('DELETE FROM users WHERE id = ?', [req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete account' });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    req.session.destroy(() => {});
    res.clearCookie('habits.sid');
    res.json({ message: 'Account deleted successfully' });
  });
}

const DEFAULT_PREFERENCES = {
  habitNameMaxLength: 20
};

function mergePreferences(stored) {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored || '{}') };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function getPreferences(req, res) {
  db.get('SELECT preferences FROM users WHERE id = ?', [req.userId], (err, row) => {
    if (err || !row) return res.status(500).json({ error: 'Failed to get preferences' });
    res.json({ preferences: mergePreferences(row.preferences) });
  });
}

function updatePreferences(req, res) {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Preferences must be a JSON object' });
  }

  db.get('SELECT preferences FROM users WHERE id = ?', [req.userId], (err, row) => {
    if (err || !row) return res.status(500).json({ error: 'Failed to get preferences' });
    const merged = { ...mergePreferences(row.preferences), ...incoming };
    db.run(
      'UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(merged), req.userId],
      (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update preferences' });
        res.json({ preferences: merged });
      }
    );
  });
}

module.exports = { signup, login, getMe, getKey, logout, updateUsername, updateTimezone, changePassword, deleteAccount, getPreferences, updatePreferences };
