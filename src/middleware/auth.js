const db = require('../config/database');

function authMiddleware(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  db.get('SELECT id FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Not authenticated' });
    }
    req.userId = req.session.userId;
    next();
  });
}

module.exports = authMiddleware;
