const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Resolve an operator secret. The env var wins and nothing is written to disk.
// Otherwise read (or generate) a mode-0600 file: <fileVar> if set, else
// /config/<fileName> in production and data/<fileName> in development.
function loadSecret(env, { envVar, fileVar, fileName, label }) {
  const fromEnv = (env[envVar] || '').trim();
  if (fromEnv) return fromEnv;

  const file = env[fileVar] ||
    (env.NODE_ENV === 'production' ? `/config/${fileName}` : path.join(__dirname, '../../data', fileName));

  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(64).toString('hex'), { mode: 0o600 });
    console.log(`Generated new ${label}`);
  }
  return fs.readFileSync(file, 'utf8').trim();
}

function loadSessionSecret(env = process.env) {
  return loadSecret(env, {
    envVar: 'SESSION_SECRET',
    fileVar: 'SESSION_SECRET_FILE',
    fileName: 'session_secret.txt',
    label: 'session secret',
  });
}

function loadMetricsToken(env = process.env) {
  return loadSecret(env, {
    envVar: 'METRICS_TOKEN',
    fileVar: 'METRICS_TOKEN_FILE',
    fileName: 'metrics_token.txt',
    label: 'metrics token',
  });
}

module.exports = { loadSecret, loadSessionSecret, loadMetricsToken };
