const { calculateStreaks } = require('../streakCalculator');

// Fix "today" to 2026-05-09 UTC so tests are deterministic
jest.mock('../timezoneUtils', () => ({
  getTodayInTimezone: () => '2026-05-09',
  userDateToUTC: (dateStr) => dateStr,
}));

const dailyHabit = {
  id: 1,
  frequency_type: 'daily',
  frequency_days: null,
  created_at: '2026-01-01 00:00:00'
};

const mwfHabit = {
  id: 2,
  frequency_type: 'custom',
  frequency_days: ['mon', 'wed', 'fri'],
  created_at: '2026-01-01 00:00:00'
};

function completed(dates) {
  return dates.map(date => ({ date, status: 'completed' }));
}

describe('daily habit', () => {
  test('4-day streak when today is completed', () => {
    const { currentStreak } = calculateStreaks(
      dailyHabit,
      completed(['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09']),
      'UTC'
    );
    expect(currentStreak).toBe(4);
  });

  test('3-day streak when today is not yet completed', () => {
    // Core bug: deleting today should not reset to 0
    const { currentStreak } = calculateStreaks(
      dailyHabit,
      completed(['2026-05-06', '2026-05-07', '2026-05-08']),
      'UTC'
    );
    expect(currentStreak).toBe(3);
  });

  test('streak is 0 when yesterday and today are both missing', () => {
    const { currentStreak } = calculateStreaks(
      dailyHabit,
      completed(['2026-05-06', '2026-05-07']),
      'UTC'
    );
    expect(currentStreak).toBe(0);
  });

  test('longest streak is tracked correctly', () => {
    const { longestStreak } = calculateStreaks(
      dailyHabit,
      completed(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-07', '2026-05-08']),
      'UTC'
    );
    expect(longestStreak).toBe(3);
  });
});

describe('custom frequency habit (Mon/Wed/Fri)', () => {
  // 2026-05-09 is a Saturday — not applicable
  // Most recent applicable day is Friday 2026-05-08

  test('streak of 1 when last applicable day (Fri) is completed, today (Sat) is not applicable', () => {
    const { currentStreak } = calculateStreaks(
      mwfHabit,
      completed(['2026-05-08']),
      'UTC'
    );
    expect(currentStreak).toBe(1);
  });

  test('grace period not consumed by non-applicable days', () => {
    // Fri completed, today is Sat (non-applicable), Mon not yet done
    // Streak should be 1 (last applicable day was Fri)
    const { currentStreak } = calculateStreaks(
      mwfHabit,
      completed(['2026-05-04', '2026-05-06', '2026-05-08']),
      'UTC'
    );
    expect(currentStreak).toBe(3);
  });
});
