const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Resolve the session secret. SESSION_SECRET env var wins and nothing is
// written to disk. Otherwise read (or generate) the secret file.
function loadSessionSecret(env = process.env) {
  const fromEnv = (env.SESSION_SECRET || '').trim();
  if (fromEnv) return fromEnv;

  const file = env.SESSION_SECRET_FILE ||
    (env.NODE_ENV === 'production' ? '/config/session_secret.txt' : path.join(__dirname, '../../data/session_secret.txt'));

  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(64).toString('hex'), { mode: 0o600 });
    console.log('Generated new session secret');
  }
  return fs.readFileSync(file, 'utf8').trim();
}

module.exports = { loadSessionSecret };
