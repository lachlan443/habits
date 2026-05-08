const db = require('../config/database');

function runMigrations() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          frequency_type TEXT NOT NULL,
          frequency_days TEXT,
          archived BOOLEAN DEFAULT 0,
          order_index INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS completions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habit_id INTEGER NOT NULL,
          date DATE NOT NULL,
          status TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
          UNIQUE(habit_id, date)
        )
      `);

      // Add columns if they don't already exist
      const addColumn = (sql) => db.run(sql, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Migration error:', err);
        }
      });

      addColumn(`ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Australia/Sydney'`);
      addColumn(`ALTER TABLE users ADD COLUMN encryption_salt TEXT`);

      // v1→v2 breaking migration: client-side encryption with independent master key.
      // Old habits are encrypted with a server-side key derived from the password —
      // they cannot be decrypted under the new scheme. Clear all user data on upgrade.
      db.run(`ALTER TABLE users ADD COLUMN encrypted_master_key TEXT`, (err) => {
        if (!err) {
          db.run('DELETE FROM users');
          console.log('v2 migration: cleared all user data (incompatible encryption scheme)');
        } else if (!err.message.includes('duplicate column')) {
          console.error('Migration error:', err);
        }
      });

      db.run(`UPDATE users SET timezone = 'Australia/Sydney' WHERE timezone IS NULL`);

      db.run('CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(archived)');
      db.run('CREATE INDEX IF NOT EXISTS idx_completions_habit_id ON completions(habit_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON completions(habit_id, date)', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database migrations completed successfully');
          resolve();
        }
      });
    });
  });
}

module.exports = { runMigrations };
