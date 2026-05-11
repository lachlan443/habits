const { webcrypto } = require('crypto');
const { subtle } = webcrypto;
const db = require('../config/database');
const { hashPassword } = require('../services/authService');

// Must match client/src/services/encryption.js exactly
const ITERATIONS = 600_000;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

async function derivePasswordKey(password, saltBytes) {
  const keyMaterial = await subtle.importKey(
    'raw', Buffer.from(password), 'PBKDF2', false, ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function aesGcmEncrypt(plainBytes, key) {
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return Buffer.from(combined).toString('base64');
}

function dbRun(sql, params) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function(err) { err ? reject(err) : resolve(this.lastID); })
  );
}

function dbGet(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
  );
}

async function seedDevUser() {
  const existing = await dbGet('SELECT id FROM users WHERE username = ?', ['admin']);
  if (existing) return;

  console.log('Seeding dev user (this takes a moment for key derivation)...');

  const DEV_PASSWORD = 'password';
  const saltBytes = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const saltBase64 = Buffer.from(saltBytes).toString('base64');

  const passwordKey = await derivePasswordKey(DEV_PASSWORD, saltBytes);
  const masterKeyBytes = webcrypto.getRandomValues(new Uint8Array(32));
  const encryptedMasterKey = await aesGcmEncrypt(masterKeyBytes, passwordKey);

  const masterKey = await subtle.importKey(
    'raw', masterKeyBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']
  );

  const passwordHash = await hashPassword(DEV_PASSWORD);
  const userId = await dbRun(
    'INSERT INTO users (username, password_hash, timezone, encryption_salt, encrypted_master_key) VALUES (?, ?, ?, ?, ?)',
    ['admin', passwordHash, 'Australia/Sydney', saltBase64, encryptedMasterKey]
  );

  const habits = [
    { name: 'Exercise', color: '#6366f1' },
    { name: 'Read',     color: '#10b981' },
    { name: 'Meditate', color: '#f59e0b' },
    { name: 'Drink water', color: '#3b82f6' },
  ];

  for (let i = 0; i < habits.length; i++) {
    const { name, color } = habits[i];
    const encryptedName = await aesGcmEncrypt(Buffer.from(name), masterKey);
    await dbRun(
      'INSERT INTO habits (user_id, name, color, frequency_type, order_index) VALUES (?, ?, ?, ?, ?)',
      [userId, encryptedName, color, 'daily', i]
    );
  }

  console.log('Dev user ready — username: admin, password: password');
}

module.exports = { seedDevUser };
