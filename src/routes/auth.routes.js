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

// Public routes
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.get('/key', authMiddleware, authController.getKey);
router.post('/logout', authMiddleware, authController.logout);
router.put('/username', authMiddleware, authController.updateUsername);
router.put('/timezone', authMiddleware, authController.updateTimezone);
router.put('/password', authMiddleware, authController.changePassword);
router.delete('/account', authMiddleware, authController.deleteAccount);
router.get('/preferences', authMiddleware, authController.getPreferences);
router.put('/preferences', authMiddleware, authController.updatePreferences);

module.exports = router;
