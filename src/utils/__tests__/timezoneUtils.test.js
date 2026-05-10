const { getTodayInTimezone } = require('../timezoneUtils');
const { calculateStreaks } = require('../streakCalculator');

// 4pm Sydney (UTC+10) = 6am UTC — the time of day the double-conversion bug
// pushed 'today' two days forward, exhausting the isFirstDay grace period
const SYDNEY_4PM_UTC = '2026-05-10T06:00:00.000Z';

const dailyHabit = {
  id: 1,
  frequency_type: 'daily',
  frequency_days: null,
  created_at: '2026-01-01 00:00:00'
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(SYDNEY_4PM_UTC));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getTodayInTimezone', () => {
  test('returns correct local date for UTC+10 at 4pm Sydney (6am UTC)', () => {
    expect(getTodayInTimezone('Australia/Sydney')).toBe('2026-05-10');
  });

  test('returns correct local date for UTC at 6am UTC', () => {
    expect(getTodayInTimezone('UTC')).toBe('2026-05-10');
  });

  test('returns previous day for UTC-10 at 6am UTC (8pm previous day locally)', () => {
    expect(getTodayInTimezone('Pacific/Honolulu')).toBe('2026-05-09');
  });
});

describe('calculateStreaks uses getTodayInTimezone', () => {
  test('8-day streak is not 0 at 4pm Sydney when completions exist for past 8 days', () => {
    const completions = [
      '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
      '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09'
    ].map(date => ({ date, status: 'completed' }));

    const { currentStreak } = calculateStreaks(dailyHabit, completions, 'Australia/Sydney');
    expect(currentStreak).toBe(8);
  });

  test('streak includes today if completed', () => {
    const completions = [
      '2026-05-08', '2026-05-09', '2026-05-10'
    ].map(date => ({ date, status: 'completed' }));

    const { currentStreak } = calculateStreaks(dailyHabit, completions, 'Australia/Sydney');
    expect(currentStreak).toBe(3);
  });
});
