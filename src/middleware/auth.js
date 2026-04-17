const { verifyToken } = require('../services/authService');
const { keyFromBase64 } = require('../services/encryptionService');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  req.encryptionKey = decoded.ek ? keyFromBase64(decoded.ek) : null;
  next();
}

module.exports = authMiddleware;
