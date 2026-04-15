import { addMinutes, parseISO, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Parse an "HH:MM" string into { hours, minutes }.
 */
export function parseTimeString(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Build a UTC Date from a date string (YYYY-MM-DD), a time string (HH:MM),
 * and a timezone (e.g. "America/New_York").
 *
 * Example: ("2026-05-06", "09:00", "America/New_York")
 *   → the UTC instant when it's 9:00 AM in New York on May 6.
 */
export function buildUtcFromLocalTime(dateStr, timeStr, timezone) {
  const { hours, minutes } = parseTimeString(timeStr);
  // Create a date object representing local midnight of that date
  const localDate = new Date(`${dateStr}T00:00:00`);
  localDate.setHours(hours, minutes, 0, 0);
  // Convert from the host's timezone to UTC
  return fromZonedTime(localDate, timezone);
}

/**
 * Format a UTC date into a display-friendly time in a given timezone.
 * Returns "10:00 AM" style strings.
 */
export function formatTimeInTimezone(utcDate, timezone) {
  const zonedDate = toZonedTime(utcDate, timezone);
  return format(zonedDate, 'h:mm a');
}

/**
 * Validate an IANA timezone string.
 */
export function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if two intervals overlap.
 * A overlaps B when A.start < B.end AND B.start < A.end
 */
export function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}
