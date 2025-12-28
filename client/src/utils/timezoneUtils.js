import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

/**
 * Convert a date in user's timezone to UTC date string (YYYY-MM-DD)
 * Used when sending dates to the backend
 */
export function dateToUTC(date, timezone) {
  // Ensure we're working with midnight in user's timezone
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);

  const utcDate = fromZonedTime(localDate, timezone);
  return format(utcDate, 'yyyy-MM-dd');
}

/**
 * Convert UTC date string (YYYY-MM-DD) to Date object in user's timezone
 * Used when receiving dates from backend
 */
export function utcToDate(utcDateStr, timezone) {
  const utcDate = new Date(utcDateStr + 'T00:00:00Z');
  return toZonedTime(utcDate, timezone);
}

/**
 * Format a Date object as YYYY-MM-DD in user's timezone
 */
export function formatDateInTimezone(date, timezone) {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

/**
 * Get "today" as a Date object in user's timezone
 */
export function getTodayInTimezone(timezone) {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  // Set to midnight
  zonedNow.setHours(0, 0, 0, 0);
  return zonedNow;
}

/**
 * Get list of all IANA timezones
 * Returns all supported timezones from the browser
 */
export function getTimezoneList() {
  try {
    // Get all IANA timezones supported by the browser
    const timezones = Intl.supportedValuesOf('timeZone');

    // Convert to label/value format and sort alphabetically
    return timezones
      .map(tz => ({
        value: tz,
        label: tz.replace(/_/g, ' ') // Replace underscores with spaces for better readability
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    // Fallback for older browsers that don't support Intl.supportedValuesOf
    console.error('Failed to get timezone list:', error);
    return [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'America/New York' },
      { value: 'America/Chicago', label: 'America/Chicago' },
      { value: 'America/Los_Angeles', label: 'America/Los Angeles' },
      { value: 'Europe/London', label: 'Europe/London' },
      { value: 'Europe/Paris', label: 'Europe/Paris' },
      { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney' },
    ];
  }
}

/**
 * Detect user's timezone from browser
 */
export function detectUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone:', error);
    return 'Australia/Sydney'; // Fallback
  }
}
