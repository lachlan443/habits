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
      `, (err) => {
        if (err) console.error('Error creating users table:', err);
      });

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
      `, (err) => {
        if (err) console.error('Error creating habits table:', err);
      });

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
      `, (err) => {
        if (err) console.error('Error creating completions table:', err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error('Error creating sessions table:', err);
      });

      db.run(`
        ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Australia/Sydney'
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding timezone column:', err);
        }
      });

      db.run(`
        UPDATE users SET timezone = 'Australia/Sydney' WHERE timezone IS NULL
      `, (err) => {
        if (err) console.error('Error setting default timezones:', err);
      });

      db.run(`
        ALTER TABLE users ADD COLUMN encryption_salt TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding encryption_salt column:', err);
        }
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(archived)');
      db.run('CREATE INDEX IF NOT EXISTS idx_completions_habit_id ON completions(habit_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON completions(habit_id, date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)', (err) => {
        if (err) {
          console.error('Error creating indexes:', err);
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
