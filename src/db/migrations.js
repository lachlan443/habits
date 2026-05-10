const db = require('../config/database');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, err => (err ? reject(err) : resolve()));
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function hasColumn(table, column) {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      resolve(!err && Array.isArray(rows) && rows.some(r => r.name === column));
    });
  });
}

async function runMigrations() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
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

  await run(`
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

  await run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!await hasColumn('users', 'timezone')) {
    await run(`ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Australia/Sydney'`);
  }
  if (!await hasColumn('users', 'encryption_salt')) {
    await run(`ALTER TABLE users ADD COLUMN encryption_salt TEXT`);
  }

  // v2: client-side encryption with independent master key.
  // Old habits encrypted with a server-side key cannot be decrypted under the new scheme.
  const v2Applied = await get(`SELECT version FROM schema_migrations WHERE version = 2`);
  if (!v2Applied) {
    if (!await hasColumn('users', 'encrypted_master_key')) {
      await run(`ALTER TABLE users ADD COLUMN encrypted_master_key TEXT`);
      await run('DELETE FROM users');
      console.log('v2 migration: cleared all user data (incompatible encryption scheme)');
    }
    await run(`INSERT OR IGNORE INTO schema_migrations (version) VALUES (2)`);
  }

  // v3: assign sequential order_index per user based on created_at
  const v3Applied = await get(`SELECT version FROM schema_migrations WHERE version = 3`);
  if (!v3Applied) {
    const habits = await all('SELECT id, user_id FROM habits ORDER BY user_id, created_at');
    const userGroups = new Map();
    habits.forEach(h => {
      if (!userGroups.has(h.user_id)) userGroups.set(h.user_id, []);
      userGroups.get(h.user_id).push(h.id);
    });
    for (const [, ids] of userGroups) {
      for (let i = 0; i < ids.length; i++) {
        await run('UPDATE habits SET order_index = ? WHERE id = ?', [i, ids[i]]);
      }
    }
    await run(`INSERT OR IGNORE INTO schema_migrations (version) VALUES (3)`);
    if (habits.length > 0) console.log('v3 migration: assigned order_index to existing habits');
  }

  await run(`UPDATE users SET timezone = 'Australia/Sydney' WHERE timezone IS NULL`);

  await run(`CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(archived)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_completions_habit_id ON completions(habit_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON completions(habit_id, date)`);

  console.log('Database migrations completed successfully');
}

module.exports = { runMigrations };
