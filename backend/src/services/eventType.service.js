import prisma from '../../prisma/prismaClient.js';
import ApiError from '../utils/ApiError.js';

/**
 * List all event types for a user.
 */
export async function listEventTypes(userId) {
  return prisma.eventType.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single event type by ID (must belong to user).
 */
export async function getEventType(userId, eventTypeId) {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!eventType || eventType.userId !== userId) {
    throw ApiError.notFound('Event type not found.');
  }

  return eventType;
}

/**
 * Create a new event type.
 */
export async function createEventType(userId, data) {
  // Check slug uniqueness for this user
  const existing = await prisma.eventType.findUnique({
    where: {
      userId_slug: { userId, slug: data.slug },
    },
  });

  if (existing) {
    throw ApiError.conflict(`An event type with slug "${data.slug}" already exists.`);
  }

  return prisma.eventType.create({
    data: {
      userId,
      title: data.title,
      slug: data.slug,
      durationMinutes: data.durationMinutes,
      description: data.description || null,
      meetingMode: data.meetingMode || 'google_meet',
      bufferBeforeMin: data.bufferBeforeMin ?? 0,
      bufferAfterMin: data.bufferAfterMin ?? 0,
    },
  });
}

/**
 * Update an existing event type.
 */
export async function updateEventType(userId, eventTypeId, data) {
  // Verify ownership
  const existing = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!existing || existing.userId !== userId) {
    throw ApiError.notFound('Event type not found.');
  }

  // If slug changed, check uniqueness
  if (data.slug && data.slug !== existing.slug) {
    const slugConflict = await prisma.eventType.findUnique({
      where: {
        userId_slug: { userId, slug: data.slug },
      },
    });
    if (slugConflict) {
      throw ApiError.conflict(`An event type with slug "${data.slug}" already exists.`);
    }
  }

  return prisma.eventType.update({
    where: { id: eventTypeId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.meetingMode !== undefined && { meetingMode: data.meetingMode }),
      ...(data.bufferBeforeMin !== undefined && { bufferBeforeMin: data.bufferBeforeMin }),
      ...(data.bufferAfterMin !== undefined && { bufferAfterMin: data.bufferAfterMin }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/**
 * Soft-delete an event type (set isActive = false).
 * We don't hard-delete because bookings reference event types.
 */
export async function deleteEventType(userId, eventTypeId) {
  const existing = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!existing || existing.userId !== userId) {
    throw ApiError.notFound('Event type not found.');
  }

  return prisma.eventType.update({
    where: { id: eventTypeId },
    data: { isActive: false },
  });
}
