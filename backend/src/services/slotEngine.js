import prisma from '../../prisma/prismaClient.js';
import { addMinutes } from 'date-fns';
import {
  buildUtcFromLocalTime,
  formatTimeInTimezone,
  intervalsOverlap,
} from '../utils/dateHelpers.js';
import { buildEventTypeLookupWhere } from '../utils/publicLookup.js';

function mergeWindows(windows) {
  if (windows.length === 0) {
    return [];
  }

  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];

  for (const window of sorted.slice(1)) {
    const previous = merged[merged.length - 1];

    if (window.start <= previous.end) {
      previous.end = new Date(Math.max(previous.end.getTime(), window.end.getTime()));
      continue;
    }

    merged.push(window);
  }

  return merged;
}

function isSameUtcDate(dateA, dateB) {
  return (
    dateA.getUTCFullYear() === dateB.getUTCFullYear() &&
    dateA.getUTCMonth() === dateB.getUTCMonth() &&
    dateA.getUTCDate() === dateB.getUTCDate()
  );
}

/**
 * Core scheduling algorithm.
 * Supports multiple weekly windows per day while keeping date overrides single-window.
 */
export async function getAvailableSlots(publicLookup, dateStr, inviteeTz) {
  const eventType = await prisma.eventType.findFirst({
    where: buildEventTypeLookupWhere(publicLookup),
    include: { user: true },
  });

  if (!eventType) {
    return { eventType: null, slots: [] };
  }

  const host = eventType.user;
  const hostTz = host.timezone;
  const duration = eventType.durationMinutes;
  const bufferBefore = eventType.bufferBeforeMin;
  const bufferAfter = eventType.bufferAfterMin;

  const schedule = await prisma.availabilitySchedule.findFirst({
    where: { userId: host.id, isDefault: true },
    include: {
      rules: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
      overrides: {
        orderBy: { overrideDate: 'asc' },
      },
    },
  });

  if (!schedule) {
    return { eventType, slots: [] };
  }

  const requestedDate = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = requestedDate.getDay();
  const dateOnly = new Date(`${dateStr}T00:00:00.000Z`);

  const override = schedule.overrides.find((entry) =>
    isSameUtcDate(new Date(entry.overrideDate), dateOnly)
  );

  let availabilityWindows = [];

  if (override) {
    if (!override.isAvailable || !override.startTime || !override.endTime) {
      return { eventType, slots: [] };
    }

    availabilityWindows = [
      {
        start: buildUtcFromLocalTime(dateStr, override.startTime, hostTz),
        end: buildUtcFromLocalTime(dateStr, override.endTime, hostTz),
      },
    ];
  } else {
    const rulesForDay = schedule.rules.filter((rule) => rule.dayOfWeek === dayOfWeek);

    if (rulesForDay.length === 0) {
      return { eventType, slots: [] };
    }

    availabilityWindows = mergeWindows(
      rulesForDay
        .map((rule) => ({
          start: buildUtcFromLocalTime(dateStr, rule.startTime, hostTz),
          end: buildUtcFromLocalTime(dateStr, rule.endTime, hostTz),
        }))
        .filter((window) => window.start < window.end)
    );
  }

  if (availabilityWindows.length === 0) {
    return { eventType, slots: [] };
  }

  const rangeStart = availabilityWindows[0].start;
  const rangeEnd = availabilityWindows[availabilityWindows.length - 1].end;

  const existingBookings = await prisma.booking.findMany({
    where: {
      hostId: host.id,
      status: 'SCHEDULED',
      startAt: { lt: rangeEnd },
      endAt: { gt: rangeStart },
    },
  });

  const blockedIntervals = existingBookings.map((booking) => ({
    start: addMinutes(booking.startAt, -bufferBefore),
    end: addMinutes(booking.endAt, bufferAfter),
  }));

  const slots = [];

  for (const window of availabilityWindows) {
    let cursor = new Date(window.start);

    while (addMinutes(cursor, duration) <= window.end) {
      const candidateEnd = addMinutes(cursor, duration);

      const hasConflict = blockedIntervals.some((blocked) =>
        intervalsOverlap(cursor, candidateEnd, blocked.start, blocked.end)
      );

      if (!hasConflict) {
        slots.push({
          startTime: formatTimeInTimezone(cursor, inviteeTz),
          endTime: formatTimeInTimezone(candidateEnd, inviteeTz),
          startUtc: cursor.toISOString(),
          endUtc: candidateEnd.toISOString(),
        });
      }

      cursor = addMinutes(cursor, duration);
    }
  }

  return { eventType, slots };
}
