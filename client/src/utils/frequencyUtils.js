const DAY_MAP = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat'
};

/**
 * Check if a habit applies to a given date based on frequency settings
 */
export function isHabitApplicable(habit, date) {
  if (habit.frequency_type === 'daily') {
    return true;
  }

  if (habit.frequency_type === 'custom' && habit.frequency_days) {
    const dayOfWeek = DAY_MAP[date.getDay()];
    return habit.frequency_days.includes(dayOfWeek);
  }

  return true; // Default to applicable if unknown type
}

/**
 * Get frequency display string for UI
 */
export function getFrequencyDisplayString(habit) {
  if (habit.frequency_type === 'daily') {
    return 'Every day';
  }

  if (habit.frequency_type === 'custom' && habit.frequency_days) {
    const dayNames = {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun'
    };

    return habit.frequency_days.map(d => dayNames[d]).join(', ');
  }

  return 'Unknown';
}
