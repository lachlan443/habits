const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const PORT = process.env.PORT || 7160;
const SESSION_SECRET_FILE = process.env.SESSION_SECRET_FILE ||
  (process.env.NODE_ENV === 'production' ? '/config/session_secret.txt' : path.join(__dirname, '../data/session_secret.txt'));

// Must run synchronously before app.js is required — app.js reads SESSION_SECRET at module load time
const secretDir = path.dirname(SESSION_SECRET_FILE);
if (!fs.existsSync(secretDir)) {
  fs.mkdirSync(secretDir, { recursive: true });
}
if (!fs.existsSync(SESSION_SECRET_FILE)) {
  const secret = crypto.randomBytes(64).toString('hex');
  fs.writeFileSync(SESSION_SECRET_FILE, secret, { mode: 0o600 });
  console.log('Generated new session secret');
}
process.env.SESSION_SECRET = fs.readFileSync(SESSION_SECRET_FILE, 'utf8').trim();

const app = require('./app');
const { runMigrations } = require('./db/migrations');

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DB_PATH || 'data/habits.db'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
