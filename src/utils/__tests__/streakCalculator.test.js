const { calculateStreaks } = require('../streakCalculator');

const TODAY = '2026-05-09';

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
  test('streak of 4 when today is completed', () => {
    const { currentStreak } = calculateStreaks(dailyHabit, completed(['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09']), 'UTC', TODAY);
    expect(currentStreak).toBe(4);
  });

  test('streak of 3 when today is not yet completed', () => {
    const { currentStreak } = calculateStreaks(dailyHabit, completed(['2026-05-06', '2026-05-07', '2026-05-08']), 'UTC', TODAY);
    expect(currentStreak).toBe(3);
  });

  test('streak increments when today is newly completed', () => {
    const { currentStreak } = calculateStreaks(dailyHabit, completed(['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09']), 'UTC', TODAY);
    expect(currentStreak).toBe(6);
  });

  test('streak is 0 when yesterday and today are both missing', () => {
    const { currentStreak } = calculateStreaks(dailyHabit, completed(['2026-05-06', '2026-05-07']), 'UTC', TODAY);
    expect(currentStreak).toBe(0);
  });

  test('longest streak tracked correctly across a gap', () => {
    const { longestStreak } = calculateStreaks(dailyHabit, completed(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-07', '2026-05-08']), 'UTC', TODAY);
    expect(longestStreak).toBe(3);
  });

  test('5-day streak with completions stored as local dates May 5-9 (Sydney)', () => {
    const { currentStreak } = calculateStreaks(dailyHabit, completed(['2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09']), 'Australia/Sydney', TODAY);
    expect(currentStreak).toBe(5);
  });

  test('4-day streak when today (May 9) not yet completed (Sydney)', () => {
    const { currentStreak } = calculateStreaks(dailyHabit, completed(['2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08']), 'Australia/Sydney', TODAY);
    expect(currentStreak).toBe(4);
  });
});

describe('custom frequency habit (Mon/Wed/Fri) — 2026-05-09 is Saturday', () => {
  test('streak of 1 when last applicable day (Fri May 8) is completed', () => {
    const { currentStreak } = calculateStreaks(mwfHabit, completed(['2026-05-08']), 'UTC', TODAY);
    expect(currentStreak).toBe(1);
  });

  test('grace period not consumed by non-applicable days', () => {
    const { currentStreak } = calculateStreaks(mwfHabit, completed(['2026-05-04', '2026-05-06', '2026-05-08']), 'UTC', TODAY);
    expect(currentStreak).toBe(3);
  });
});
