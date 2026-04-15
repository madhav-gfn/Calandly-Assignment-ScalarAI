import prisma from '../../prisma/prismaClient.js';
import ApiError from '../utils/ApiError.js';
import { intervalsOverlap } from '../utils/dateHelpers.js';
import { addMinutes } from 'date-fns';
import { sendBookingConfirmation } from './email.service.js';
import { buildEventTypeLookupWhere } from '../utils/publicLookup.js';

/**
 * Create a booking with double-booking prevention.
 * Uses a Prisma interactive transaction for atomicity.
 */
export async function createBooking(publicLookup, data) {
  // Resolve event type
  const eventType = await prisma.eventType.findFirst({
    where: buildEventTypeLookupWhere(publicLookup),
  });

  if (!eventType) {
    throw ApiError.notFound('Event type not found.');
  }

  const hostId = eventType.userId;
  const startAt = new Date(data.startUtc);
  const endAt = new Date(data.endUtc);

  // Validate times
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    throw ApiError.badRequest('Invalid start or end time.');
  }

  if (startAt >= endAt) {
    throw ApiError.badRequest('Start time must be before end time.');
  }

  // Expand with buffer for conflict check
  const bufferStart = addMinutes(startAt, -eventType.bufferBeforeMin);
  const bufferEnd = addMinutes(endAt, eventType.bufferAfterMin);

  // Double-booking prevention via transaction
  return prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        hostId,
        status: 'SCHEDULED',
        startAt: { lt: bufferEnd },
        endAt: { gt: bufferStart },
      },
    });

    if (conflict) {
      throw ApiError.conflict('This time slot is no longer available.');
    }

    // Create the booking
    const booking = await tx.booking.create({
      data: {
        eventTypeId: eventType.id,
        hostId,
        inviteeName: data.inviteeName,
        inviteeEmail: data.inviteeEmail,
        startAt,
        endAt,
        meetingMode: data.meetingMode || null,
        meetingLink: data.meetingLink || null,
      },
    });

    // Create custom questions + answers if provided
    if (data.responses && Array.isArray(data.responses)) {
      for (const resp of data.responses) {
        const question = await tx.bookingQuestion.create({
          data: {
            bookingId: booking.id,
            questionText: resp.question,
            sortOrder: resp.sortOrder || 0,
            isRequired: resp.isRequired || false,
          },
        });

        if (resp.answer) {
          await tx.bookingAnswer.create({
            data: {
              questionId: question.id,
              answerText: resp.answer,
            },
          });
        }
      }
    }

    // Return booking with relations
    const fullBooking = await tx.booking.findUnique({
      where: { id: booking.id },
      include: {
        eventType: true,
        host: { select: { id: true, name: true, email: true, timezone: true, username: true } },
        questions: { include: { answer: true } },
      },
    });

    // Send confirmation email (non-blocking, outside transaction)
    sendBookingConfirmation(fullBooking).catch(() => {});

    return fullBooking;
  });
}

/**
 * Get event type info for the public booking page header.
 */
export async function getPublicEventType(publicLookup) {
  const eventType = await prisma.eventType.findFirst({
    where: buildEventTypeLookupWhere(publicLookup),
    include: {
      user: { select: { id: true, name: true, timezone: true, username: true } },
    },
  });

  if (!eventType) {
    throw ApiError.notFound('Event type not found.');
  }

  return eventType;
}
