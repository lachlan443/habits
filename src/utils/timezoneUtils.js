const { toZonedTime, fromZonedTime, formatInTimeZone } = require('date-fns-tz');
const { format } = require('date-fns');

/**
 * Get "today" in user's timezone as YYYY-MM-DD string
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @returns {string} Today's date in user's timezone
 */
function getTodayInTimezone(timezone) {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  return formatInTimeZone(zonedNow, timezone, 'yyyy-MM-dd');
}

/**
 * Get current UTC date as YYYY-MM-DD string
 * @returns {string} Current UTC date
 */
function getTodayUTC() {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Format date as YYYY-MM-DD in UTC
 * @param {Date} date - Date object
 * @returns {string} Date formatted in UTC
 */
function formatDateUTC(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Convert a date string in user's timezone to UTC date string (YYYY-MM-DD)
 * @param {string} dateStr - Date in YYYY-MM-DD format (user's timezone)
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @returns {string} UTC date in YYYY-MM-DD format
 */
function userDateToUTC(dateStr, timezone) {
  // Parse the date string in user's timezone (midnight in their TZ)
  const dateParts = dateStr.split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
  const day = parseInt(dateParts[2]);

  // Create a date object representing midnight in user's timezone
  const userDate = new Date(year, month, day, 0, 0, 0);

  // Convert to UTC
  const utcDate = fromZonedTime(userDate, timezone);

  // Format as YYYY-MM-DD in UTC
  return format(utcDate, 'yyyy-MM-dd');
}

/**
 * Convert a UTC date string to user's timezone date string (YYYY-MM-DD)
 * @param {string} utcDateStr - UTC date in YYYY-MM-DD format
 * @param {string} timezone - IANA timezone
 * @returns {string} Date in user's timezone in YYYY-MM-DD format
 */
function utcToUserDate(utcDateStr, timezone) {
  const utcDate = new Date(utcDateStr + 'T00:00:00Z');
  const zonedDate = toZonedTime(utcDate, timezone);
  return formatInTimeZone(zonedDate, timezone, 'yyyy-MM-dd');
}

module.exports = {
  getTodayInTimezone,
  getTodayUTC,
  formatDateUTC,
  userDateToUTC,
  utcToUserDate
};
