import prisma from '../../prisma/prismaClient.js';
import ApiError from '../utils/ApiError.js';

/**
 * List meetings for the host.
 * Supports filtering by status: 'upcoming', 'past', 'cancelled'
 */
export async function listMeetings(userId, status) {
  const now = new Date();
  let where = { hostId: userId };

  switch (status) {
    case 'upcoming':
      where.status = 'SCHEDULED';
      where.startAt = { gt: now };
      break;
    case 'past':
      where.OR = [
        { status: 'COMPLETED' },
        { status: 'SCHEDULED', startAt: { lt: now } },
      ];
      break;
    case 'cancelled':
      where.status = 'CANCELLED';
      break;
    default:
      // All meetings
      break;
  }

  return prisma.booking.findMany({
    where,
    include: {
      eventType: { select: { title: true, slug: true, durationMinutes: true } },
      questions: { include: { answer: true } },
    },
    orderBy: { startAt: 'asc' },
  });
}

/**
 * Get a single meeting with full details.
 */
export async function getMeeting(userId, meetingId) {
  const meeting = await prisma.booking.findUnique({
    where: { id: meetingId },
    include: {
      eventType: true,
      host: { select: { id: true, name: true, email: true, timezone: true } },
      invitee: { select: { id: true, name: true, email: true } },
      questions: { include: { answer: true } },
      rescheduledFrom: { select: { id: true, startAt: true, endAt: true } },
      rescheduledTo: { select: { id: true, startAt: true, endAt: true } },
    },
  });

  if (!meeting || meeting.hostId !== userId) {
    throw ApiError.notFound('Meeting not found.');
  }

  return meeting;
}

/**
 * Cancel a meeting.
 */
export async function cancelMeeting(userId, meetingId) {
  const meeting = await prisma.booking.findUnique({
    where: { id: meetingId },
  });

  if (!meeting || meeting.hostId !== userId) {
    throw ApiError.notFound('Meeting not found.');
  }

  if (meeting.status === 'CANCELLED') {
    throw ApiError.badRequest('Meeting is already cancelled.');
  }

  return prisma.booking.update({
    where: { id: meetingId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
    include: {
      eventType: { select: { title: true } },
    },
  });
}

/**
 * Reschedule a meeting.
 * Creates a new booking linked to the original via rescheduledFromId,
 * then cancels the original.
 */
export async function rescheduleMeeting(userId, meetingId, data) {
  const original = await prisma.booking.findUnique({
    where: { id: meetingId },
    include: { eventType: true },
  });

  if (!original || original.hostId !== userId) {
    throw ApiError.notFound('Meeting not found.');
  }

  if (original.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot reschedule a cancelled meeting.');
  }

  const newStart = new Date(data.startUtc);
  const newEnd = new Date(data.endUtc);

  if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
    throw ApiError.badRequest('Invalid start or end time.');
  }

  // Transaction: check conflicts, create new booking, cancel old one
  return prisma.$transaction(async (tx) => {
    // Check for conflicts at the new time
    const conflict = await tx.booking.findFirst({
      where: {
        hostId: userId,
        status: 'SCHEDULED',
        id: { not: meetingId }, // exclude the original
        startAt: { lt: newEnd },
        endAt: { gt: newStart },
      },
    });

    if (conflict) {
      throw ApiError.conflict('The new time slot is not available.');
    }

    // Create the rescheduled booking
    const newBooking = await tx.booking.create({
      data: {
        eventTypeId: original.eventTypeId,
        hostId: original.hostId,
        inviteeId: original.inviteeId,
        inviteeName: original.inviteeName,
        inviteeEmail: original.inviteeEmail,
        startAt: newStart,
        endAt: newEnd,
        meetingMode: original.meetingMode,
        meetingLink: original.meetingLink,
        rescheduledFromId: meetingId,
      },
    });

    // Cancel the original
    await tx.booking.update({
      where: { id: meetingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return tx.booking.findUnique({
      where: { id: newBooking.id },
      include: {
        eventType: { select: { title: true, slug: true, durationMinutes: true } },
        rescheduledFrom: { select: { id: true, startAt: true, endAt: true } },
      },
    });
  });
}
