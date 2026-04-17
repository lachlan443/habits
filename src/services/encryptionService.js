const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KDF_ITERATIONS = 200000;
const KEY_LENGTH = 32;

function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH).toString('base64');
}

function deriveKey(password, saltBase64) {
  const salt = Buffer.from(saltBase64, 'base64');
  return crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, KEY_LENGTH, 'sha256');
}

function keyFromBase64(keyBase64) {
  return Buffer.from(keyBase64, 'base64');
}

function encrypt(plaintext, key) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  if (!key) throw new Error('Encryption key required');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

function decrypt(ciphertext, key) {
  if (ciphertext === null || ciphertext === undefined) return ciphertext;
  if (!key) throw new Error('Encryption key required');

  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8');
}

module.exports = {
  generateSalt,
  deriveKey,
  keyFromBase64,
  encrypt,
  decrypt
};
