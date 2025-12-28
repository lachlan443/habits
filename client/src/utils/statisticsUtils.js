import { formatDate, addDays } from './dateUtils';
import { isHabitApplicable } from './frequencyUtils';

/**
 * Calculate statistics for a habit
 * @param {Object} habit - The habit object
 * @param {Array} completions - All completions
 * @returns {Object} - { currentStreak, longestStreak, totalCount }
 */
export function calculateHabitStats(habit, completions) {
  // Filter completions for this habit
  const habitCompletions = completions.filter(c => c.habit_id === habit.id);

  // Create a map for fast lookup
  const completionMap = new Map();
  habitCompletions.forEach(c => {
    completionMap.set(c.date, c);
  });

  // Calculate total count (only 'completed' status)
  const totalCount = habitCompletions.filter(c => c.status === 'completed').length;

  // Calculate current streak (from today backwards)
  const currentStreak = calculateCurrentStreak(habit, completionMap);

  // Calculate longest streak (scan all history)
  const longestStreak = calculateLongestStreak(habit, completionMap);

  return {
    currentStreak,
    longestStreak,
    totalCount
  };
}

/**
 * Calculate current streak from today backwards
 */
function calculateCurrentStreak(habit, completionMap) {
  let streak = 0;
  let checkDate = new Date();

  // Go back up to 365 days
  for (let i = 0; i < 365; i++) {
    // Skip non-applicable days
    if (!isHabitApplicable(habit, checkDate)) {
      checkDate = addDays(checkDate, -1);
      continue;
    }

    const dateStr = formatDate(checkDate);
    const completion = completionMap.get(dateStr);

    // If completed, increment streak
    if (completion?.status === 'completed') {
      streak++;
      checkDate = addDays(checkDate, -1);
    }
    // If skipped, continue the streak but don't count
    else if (completion?.status === 'skipped') {
      checkDate = addDays(checkDate, -1);
    }
    // If not completed or skipped, streak is broken
    else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate longest streak in all history
 */
function calculateLongestStreak(habit, completionMap) {
  // Get all completion dates sorted
  const dates = Array.from(completionMap.keys()).sort();

  if (dates.length === 0) return 0;

  let longestStreak = 0;
  let currentStreak = 0;

  // Find the earliest and latest dates
  const earliestDate = new Date(dates[0]);
  const latestDate = new Date(dates[dates.length - 1]);

  let checkDate = new Date(earliestDate);

  // Scan through all dates
  while (checkDate <= latestDate) {
    // Skip non-applicable days
    if (!isHabitApplicable(habit, checkDate)) {
      checkDate = addDays(checkDate, 1);
      continue;
    }

    const dateStr = formatDate(checkDate);
    const completion = completionMap.get(dateStr);

    // If completed, increment current streak
    if (completion?.status === 'completed') {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    }
    // If skipped, maintain streak but don't count
    else if (completion?.status === 'skipped') {
      // Continue, don't break streak
    }
    // If not completed or skipped, reset streak
    else {
      currentStreak = 0;
    }

    checkDate = addDays(checkDate, 1);
  }

  return longestStreak;
}
