const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const perUsernameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `login:${(req.body.username || '').toLowerCase()}`,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.body.username
});

// Public routes
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, perUsernameLimiter, authController.login);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.get('/key', authMiddleware, authController.getKey);
router.post('/logout', authMiddleware, authController.logout);
router.put('/username', authMiddleware, authController.updateUsername);
router.put('/timezone', authMiddleware, authController.updateTimezone);
router.put('/password', authMiddleware, authController.changePassword);
router.delete('/account', authMiddleware, authController.deleteAccount);

module.exports = router;
