import prisma from '../../prisma/prismaClient.js';
import { addMinutes } from 'date-fns';
import {
  buildUtcFromLocalTime,
  formatTimeInTimezone,
  intervalsOverlap,
} from '../utils/dateHelpers.js';

/**
 * ★ Core Scheduling Algorithm
 *
 * Given an event type slug and a requested date, computes the available time
 * slots by comparing the host's availability schedule against existing bookings.
 *
 * @param {string} slug        — Event type URL slug
 * @param {string} dateStr     — Requested date in "YYYY-MM-DD" format
 * @param {string} inviteeTz   — Invitee's timezone (e.g. "Asia/Kolkata")
 * @returns {Array<{ startTime, endTime, startUtc, endUtc }>}
 */
export async function getAvailableSlots(slug, dateStr, inviteeTz) {
  // ── Step 1: Resolve the Event Type ───────────────────────────
  const eventType = await prisma.eventType.findFirst({
    where: { slug, isActive: true },
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

  // ── Step 2: Resolve the Host's Default Schedule ──────────────
  const schedule = await prisma.availabilitySchedule.findFirst({
    where: { userId: host.id, isDefault: true },
    include: {
      rules: true,
      overrides: true,
    },
  });

  if (!schedule) {
    return { eventType, slots: [] };
  }

  // ── Step 3: Determine Working Window for the Date ────────────
  const requestedDate = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = requestedDate.getDay(); // 0 = Sunday

  // Check overrides first (date-specific exceptions)
  const dateOnly = new Date(dateStr + 'T00:00:00.000Z');
  const override = schedule.overrides.find((o) => {
    const overrideDate = new Date(o.overrideDate);
    return (
      overrideDate.getUTCFullYear() === dateOnly.getUTCFullYear() &&
      overrideDate.getUTCMonth() === dateOnly.getUTCMonth() &&
      overrideDate.getUTCDate() === dateOnly.getUTCDate()
    );
  });

  let windowStart, windowEnd;

  if (override) {
    if (!override.isAvailable) {
      // Day is blocked
      return { eventType, slots: [] };
    }
    // Use override times
    windowStart = buildUtcFromLocalTime(dateStr, override.startTime, hostTz);
    windowEnd = buildUtcFromLocalTime(dateStr, override.endTime, hostTz);
  } else {
    // Fall back to weekly rules
    const rulesForDay = schedule.rules.filter((r) => r.dayOfWeek === dayOfWeek);

    if (rulesForDay.length === 0) {
      // Host doesn't work this day
      return { eventType, slots: [] };
    }

    // Use the first rule (simplest case — one window per day)
    // For multi-window support, you'd loop through all rules
    windowStart = buildUtcFromLocalTime(dateStr, rulesForDay[0].startTime, hostTz);
    windowEnd = buildUtcFromLocalTime(dateStr, rulesForDay[0].endTime, hostTz);
  }

  // ── Step 4: Fetch Existing Bookings ──────────────────────────
  const existingBookings = await prisma.booking.findMany({
    where: {
      hostId: host.id,
      status: 'SCHEDULED',
      startAt: { lt: windowEnd },
      endAt: { gt: windowStart },
    },
  });

  // ── Step 5: Expand Bookings with Buffer Time ─────────────────
  const blockedIntervals = existingBookings.map((b) => ({
    start: addMinutes(b.startAt, -bufferBefore),
    end: addMinutes(b.endAt, bufferAfter),
  }));

  // ── Step 6: Generate Candidate Slots ─────────────────────────
  const slots = [];
  let cursor = new Date(windowStart);

  while (addMinutes(cursor, duration) <= windowEnd) {
    const candidateEnd = addMinutes(cursor, duration);

    // ── Step 7: Filter Out Conflicts ───────────────────────────
    const hasConflict = blockedIntervals.some((blocked) =>
      intervalsOverlap(cursor, candidateEnd, blocked.start, blocked.end)
    );

    if (!hasConflict) {
      // ── Step 8: Convert to Invitee Timezone ──────────────────
      slots.push({
        startTime: formatTimeInTimezone(cursor, inviteeTz),
        endTime: formatTimeInTimezone(candidateEnd, inviteeTz),
        startUtc: cursor.toISOString(),
        endUtc: candidateEnd.toISOString(),
      });
    }

    // Move cursor forward by the event duration (step interval)
    cursor = addMinutes(cursor, duration);
  }

  return { eventType, slots };
}
