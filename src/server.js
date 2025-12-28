const app = require('./app');
const { runMigrations } = require('./db/migrations');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const PORT = process.env.PORT || 7160;
// Use local data directory in development, /config in production
const JWT_SECRET_FILE = process.env.JWT_SECRET_FILE ||
  (process.env.NODE_ENV === 'production' ? '/config/jwt_secret.txt' : path.join(__dirname, '../data/jwt_secret.txt'));

// Generate JWT secret if it doesn't exist
function ensureJWTSecret() {
  const secretDir = path.dirname(JWT_SECRET_FILE);

  // Ensure directory exists
  if (!fs.existsSync(secretDir)) {
    fs.mkdirSync(secretDir, { recursive: true });
  }

  if (!fs.existsSync(JWT_SECRET_FILE)) {
    const secret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(JWT_SECRET_FILE, secret, { mode: 0o600 });
    console.log('Generated new JWT secret');
  }

  process.env.JWT_SECRET = fs.readFileSync(JWT_SECRET_FILE, 'utf8').trim();
}

async function start() {
  try {
    // Ensure JWT secret exists
    ensureJWTSecret();

    // Run database migrations
    await runMigrations();

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DB_PATH || '/config/habits.db'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
