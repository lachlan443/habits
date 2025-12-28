const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use local data directory in development, /config in production
const DB_PATH = process.env.DB_PATH ||
  (process.env.NODE_ENV === 'production' ? '/config/habits.db' : path.join(__dirname, '../../data/habits.db'));

// Ensure /config directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database at', DB_PATH);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Enable WAL mode for better concurrency
db.run('PRAGMA journal_mode = WAL');

module.exports = db;
