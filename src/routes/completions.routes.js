const express = require('express');
const router = express.Router();
const completionsController = require('../controllers/completions.controller');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.get('/', completionsController.getCompletions);
router.get('/total', completionsController.getTotalCompletions);
router.post('/', completionsController.createCompletion);
router.delete('/by-date', completionsController.deleteCompletionByDate);
router.delete('/:id', completionsController.deleteCompletion);

module.exports = router;
