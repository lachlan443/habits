const { getTodayInTimezone, userDateToUTC } = require('./timezoneUtils');

/**
 * Check if a habit applies to a given date based on frequency settings
 */
function isHabitApplicable(habit, date) {
  if (habit.frequency_type === 'daily') {
    return true;
  }

  if (habit.frequency_type === 'custom' && habit.frequency_days) {
    const dayMap = {
      0: 'sun',
      1: 'mon',
      2: 'tue',
      3: 'wed',
      4: 'thu',
      5: 'fri',
      6: 'sat'
    };

    const dayOfWeek = dayMap[date.getDay()];
    const frequencyDays = typeof habit.frequency_days === 'string'
      ? JSON.parse(habit.frequency_days)
      : habit.frequency_days;

    return frequencyDays.includes(dayOfWeek);
  }

  return true; // Default to applicable if unknown type
}

/**
 * Format date as YYYY-MM-DD in UTC
 */
function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate current and longest streaks for a habit
 * Skipped days don't break streaks, but missing applicable days do
 */
function calculateStreaks(habit, completions, userTimezone) {
  // Keep completion dates in UTC (as stored in database)
  const completionMap = new Map();
  completions.forEach(c => {
    completionMap.set(c.date, c.status);
  });

  // Get "today" in user's timezone, then convert to UTC for comparison
  const todayUserTZ = getTodayInTimezone(userTimezone || 'Australia/Sydney');
  const todayUTC = userDateToUTC(todayUserTZ, userTimezone || 'Australia/Sydney');
  const today = new Date(todayUTC + 'T00:00:00Z');
  today.setUTCHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (backwards from today)
  let checkDate = new Date(today);
  let isFirstDay = true;

  while (true) {
    const dateStr = formatDate(checkDate);

    if (!isHabitApplicable(habit, checkDate)) {
      // Skip non-applicable days
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      isFirstDay = false;
      continue;
    }

    const status = completionMap.get(dateStr);

    if (status === 'completed' || status === 'skipped') {
      currentStreak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      isFirstDay = false;
    } else {
      // If it's today and not completed, don't break the streak (day isn't over yet)
      // Just skip it and continue checking yesterday
      if (isFirstDay) {
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        isFirstDay = false;
        continue;
      }
      // No completion found for past applicable day - streak broken
      break;
    }

    // Safety check to prevent infinite loop (only go back 1 year)
    const oneYearAgo = new Date(today);
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
    if (checkDate < oneYearAgo) break;
  }

  // Calculate longest streak (scan all history)
  const sortedDates = Array.from(completionMap.keys()).sort();
  if (sortedDates.length > 0) {
    const firstDate = new Date(sortedDates[0] + 'T00:00:00Z');
    checkDate = new Date(firstDate);
    const endDate = new Date(today);

    while (checkDate <= endDate) {
      const dateStr = formatDate(checkDate);

      if (!isHabitApplicable(habit, checkDate)) {
        checkDate.setUTCDate(checkDate.getUTCDate() + 1);
        continue;
      }

      const status = completionMap.get(dateStr);

      if (status === 'completed' || status === 'skipped') {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }

      checkDate.setUTCDate(checkDate.getUTCDate() + 1);
    }
  }

  return {
    currentStreak,
    longestStreak
  };
}

/**
 * Calculate completion rate (percentage)
 * Excludes skipped days from both numerator and denominator
 */
function calculateCompletionRate(habit, completions, userTimezone) {
  // Keep completion dates in UTC (as stored in database)
  const completionMap = new Map();
  completions.forEach(c => {
    completionMap.set(c.date, c.status);
  });

  // Get "today" in user's timezone, then convert to UTC for comparison
  const todayUserTZ = getTodayInTimezone(userTimezone || 'Australia/Sydney');
  const todayUTC = userDateToUTC(todayUserTZ, userTimezone || 'Australia/Sydney');
  const today = new Date(todayUTC + 'T00:00:00Z');
  today.setUTCHours(0, 0, 0, 0);

  const createdDate = new Date(habit.created_at);
  createdDate.setUTCHours(0, 0, 0, 0);

  let applicableDays = 0;
  let completedDays = 0;

  let checkDate = new Date(createdDate);

  while (checkDate <= today) {
    if (isHabitApplicable(habit, checkDate)) {
      const dateStr = formatDate(checkDate);
      const status = completionMap.get(dateStr);

      if (status !== 'skipped') {
        applicableDays++;
        if (status === 'completed') {
          completedDays++;
        }
      }
    }
    checkDate.setUTCDate(checkDate.getUTCDate() + 1);
  }

  return applicableDays > 0 ? Math.round((completedDays / applicableDays) * 100) : 0;
}

module.exports = {
  isHabitApplicable,
  formatDate,
  calculateStreaks,
  calculateCompletionRate
};
