const express = require('express');
const router = express.Router();
const habitsController = require('../controllers/habits.controller');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.get('/', habitsController.getHabits);
router.get('/:id', habitsController.getHabit);
router.get('/:id/stats', habitsController.getHabitStats);
router.post('/', habitsController.createHabit);
router.put('/:id', habitsController.updateHabit);
router.delete('/:id', habitsController.deleteHabit);

module.exports = router;
