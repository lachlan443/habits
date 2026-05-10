const { getTodayInTimezone } = require('./timezoneUtils');

function isHabitApplicable(habit, date) {
  if (habit.frequency_type === 'daily') return true;

  if (habit.frequency_type === 'custom' && habit.frequency_days) {
    const dayMap = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
    const frequencyDays = typeof habit.frequency_days === 'string'
      ? JSON.parse(habit.frequency_days)
      : habit.frequency_days;
    return frequencyDays.includes(dayMap[date.getUTCDay()]);
  }

  return true;
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function calculateStreaks(habit, completions, userTimezone) {
  const completionMap = new Map();
  completions.forEach(c => completionMap.set(c.date, c.status));

  const today = dateFromStr(getTodayInTimezone(userTimezone || 'UTC'));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let isFirstDay = true;

  let checkDate = new Date(today);

  while (true) {
    const dateStr = formatDate(checkDate);

    if (!isHabitApplicable(habit, checkDate)) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      continue;
    }

    const status = completionMap.get(dateStr);

    if (status === 'completed' || status === 'skipped') {
      currentStreak++;
      isFirstDay = false;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      if (isFirstDay) {
        isFirstDay = false;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        continue;
      }
      break;
    }

    const oneYearAgo = new Date(today);
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
    if (checkDate < oneYearAgo) break;
  }

  const sortedDates = Array.from(completionMap.keys()).sort();
  if (sortedDates.length > 0) {
    checkDate = dateFromStr(sortedDates[0]);
    while (checkDate <= today) {
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

  return { currentStreak, longestStreak };
}

function calculateCompletionRate(habit, completions, userTimezone) {
  const completionMap = new Map();
  completions.forEach(c => completionMap.set(c.date, c.status));

  const today = dateFromStr(getTodayInTimezone(userTimezone || 'UTC'));
  const createdDate = dateFromStr(habit.created_at.split(' ')[0]);

  let applicableDays = 0;
  let completedDays = 0;
  let checkDate = new Date(createdDate);

  while (checkDate <= today) {
    if (isHabitApplicable(habit, checkDate)) {
      const status = completionMap.get(formatDate(checkDate));
      if (status !== 'skipped') {
        applicableDays++;
        if (status === 'completed') completedDays++;
      }
    }
    checkDate.setUTCDate(checkDate.getUTCDate() + 1);
  }

  return applicableDays > 0 ? Math.round((completedDays / applicableDays) * 100) : 0;
}

module.exports = { isHabitApplicable, formatDate, calculateStreaks, calculateCompletionRate };
