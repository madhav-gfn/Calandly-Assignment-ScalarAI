import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { DAY_ROWS, EVENT_ACCENTS, CONFIRMATION_STORAGE_KEY } from '../constants.js';

export function getRouteTitle(pathname) {
  if (pathname.startsWith('/app/scheduling')) return 'Scheduling';
  if (pathname.startsWith('/app/meetings')) return 'Meetings';
  if (pathname.startsWith('/app/availability')) return 'Availability';
  if (pathname.startsWith('/app/contacts')) return 'Contacts';
  if (pathname.startsWith('/app/workflows')) return 'Workflows';
  if (pathname.startsWith('/app/integrations')) return 'Integrations & apps';
  if (pathname.startsWith('/app/routing')) return 'Routing';
  if (pathname.startsWith('/app/analytics')) return 'Analytics';
  if (pathname.startsWith('/app/admin')) return 'Admin center';
  return 'Calendly Clone';
}

export function getEventAccent(seed) {
  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return EVENT_ACCENTS[hash % EVENT_ACCENTS.length];
}

export function createRulesByDay(rules = []) {
  const grouped = DAY_ROWS.reduce((accumulator, day) => {
    accumulator[day.value] = [];
    return accumulator;
  }, {});

  rules.forEach((rule) => {
    grouped[rule.dayOfWeek] = grouped[rule.dayOfWeek] || [];
    grouped[rule.dayOfWeek].push({
      startTime: rule.startTime,
      endTime: rule.endTime,
    });
  });

  return grouped;
}

export function flattenRulesByDay(rulesByDay) {
  return DAY_ROWS.flatMap((day) =>
    (rulesByDay[day.value] || [])
      .filter((entry) => entry.startTime && entry.endTime)
      .map((entry) => ({
        dayOfWeek: day.value,
        startTime: entry.startTime,
        endTime: entry.endTime,
      }))
  );
}

export function formatDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateInTimezone(value, timezone, pattern) {
  return formatInTimeZone(new Date(value), timezone, pattern);
}

export function readConfirmationRecord() {
  try {
    const value = sessionStorage.getItem(CONFIRMATION_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function storeConfirmationRecord(record) {
  sessionStorage.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(record));
}
