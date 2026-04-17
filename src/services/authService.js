const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set — ensureJWTSecret() must run at startup');
  }
  return secret;
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken(userId, encryptionKey) {
  const payload = { userId };
  if (encryptionKey) {
    payload.ek = encryptionKey.toString('base64');
  }
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (error) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};
