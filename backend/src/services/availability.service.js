import prisma from '../../prisma/prismaClient.js';
import ApiError from '../utils/ApiError.js';

// ── Schedules ──────────────────────────────────────────────────

/**
 * List all availability schedules for a user.
 */
export async function listSchedules(userId) {
  return prisma.availabilitySchedule.findMany({
    where: { userId },
    include: {
      rules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      overrides: { orderBy: { overrideDate: 'asc' } },
    },
  });
}

/**
 * Get a single schedule with rules and overrides.
 */
export async function getSchedule(userId, scheduleId) {
  const schedule = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
    include: {
      rules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      overrides: { orderBy: { overrideDate: 'asc' } },
    },
  });

  if (!schedule || schedule.userId !== userId) {
    throw ApiError.notFound('Schedule not found.');
  }

  return schedule;
}

/**
 * Create a new availability schedule.
 * If marked as default, unset the default flag on any existing default schedule.
 */
export async function createSchedule(userId, data) {
  if (data.isDefault) {
    await prisma.availabilitySchedule.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.availabilitySchedule.create({
    data: {
      userId,
      name: data.name,
      isDefault: data.isDefault ?? false,
    },
    include: { rules: true, overrides: true },
  });
}

/**
 * Update a schedule's name or default flag.
 */
export async function updateSchedule(userId, scheduleId, data) {
  const existing = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!existing || existing.userId !== userId) {
    throw ApiError.notFound('Schedule not found.');
  }

  // If setting as default, unset others
  if (data.isDefault) {
    await prisma.availabilitySchedule.updateMany({
      where: { userId, isDefault: true, id: { not: scheduleId } },
      data: { isDefault: false },
    });
  }

  return prisma.availabilitySchedule.update({
    where: { id: scheduleId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
    include: { rules: true, overrides: true },
  });
}

/**
 * Delete a schedule (cascades rules + overrides via Prisma schema).
 */
export async function deleteSchedule(userId, scheduleId) {
  const existing = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!existing || existing.userId !== userId) {
    throw ApiError.notFound('Schedule not found.');
  }

  return prisma.availabilitySchedule.delete({
    where: { id: scheduleId },
  });
}

// ── Rules (Bulk Replace) ───────────────────────────────────────

/**
 * Replace all weekly rules for a schedule.
 * Deletes existing rules and inserts the new set in a single transaction.
 *
 * @param {string} userId
 * @param {string} scheduleId
 * @param {Array<{dayOfWeek: number, startTime: string, endTime: string}>} rules
 */
export async function replaceRules(userId, scheduleId, rules) {
  const existing = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!existing || existing.userId !== userId) {
    throw ApiError.notFound('Schedule not found.');
  }

  // Validate rules
  for (const rule of rules) {
    if (rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
      throw ApiError.badRequest(`Invalid dayOfWeek: ${rule.dayOfWeek}. Must be 0-6.`);
    }
    if (rule.startTime >= rule.endTime) {
      throw ApiError.badRequest(
        `startTime (${rule.startTime}) must be before endTime (${rule.endTime}).`
      );
    }
  }

  // Transaction: delete old rules, insert new ones
  await prisma.$transaction([
    prisma.availabilityRule.deleteMany({ where: { scheduleId } }),
    prisma.availabilityRule.createMany({
      data: rules.map((r) => ({
        scheduleId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    }),
  ]);

  // Return the schedule with updated rules
  return prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
    include: {
      rules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      overrides: true,
    },
  });
}

// ── Overrides ──────────────────────────────────────────────────

/**
 * List overrides for a schedule.
 */
export async function listOverrides(userId, scheduleId) {
  const schedule = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule || schedule.userId !== userId) {
    throw ApiError.notFound('Schedule not found.');
  }

  return prisma.availabilityOverride.findMany({
    where: { scheduleId },
    orderBy: { overrideDate: 'asc' },
  });
}

/**
 * Create a date-specific override.
 */
export async function createOverride(userId, scheduleId, data) {
  const schedule = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule || schedule.userId !== userId) {
    throw ApiError.notFound('Schedule not found.');
  }

  // If marking available, require time range
  if (data.isAvailable && (!data.startTime || !data.endTime)) {
    throw ApiError.badRequest(
      'startTime and endTime are required when isAvailable is true.'
    );
  }

  return prisma.availabilityOverride.create({
    data: {
      scheduleId,
      overrideDate: new Date(data.overrideDate),
      isAvailable: data.isAvailable ?? false,
      startTime: data.isAvailable ? data.startTime : null,
      endTime: data.isAvailable ? data.endTime : null,
      note: data.note || null,
    },
  });
}

/**
 * Delete an override.
 */
export async function deleteOverride(userId, overrideId) {
  const override = await prisma.availabilityOverride.findUnique({
    where: { id: overrideId },
    include: { schedule: true },
  });

  if (!override || override.schedule.userId !== userId) {
    throw ApiError.notFound('Override not found.');
  }

  return prisma.availabilityOverride.delete({
    where: { id: overrideId },
  });
}
