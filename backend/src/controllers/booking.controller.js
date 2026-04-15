import { getAvailableSlots } from '../services/slotEngine.js';
import * as bookingService from '../services/booking.service.js';
import ApiError from '../utils/ApiError.js';

/**
 * GET /api/booking/:slug — Public event type info for booking page.
 */
export async function getEventInfo(req, res) {
  const eventType = await bookingService.getPublicEventType(req.params.slug);
  res.json({ success: true, data: eventType });
}

/**
 * GET /api/booking/:slug/slots?date=YYYY-MM-DD&timezone=TZ
 * Returns available time slots for a given date.
 */
export async function getSlots(req, res) {
  const { date, timezone } = req.query;

  if (!date) {
    throw ApiError.badRequest('Query parameter "date" is required (YYYY-MM-DD).');
  }

  if (!timezone) {
    throw ApiError.badRequest('Query parameter "timezone" is required (e.g. Asia/Kolkata).');
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest('Invalid date format. Use YYYY-MM-DD.');
  }

  const result = await getAvailableSlots(req.params.slug, date, timezone);

  if (!result.eventType) {
    throw ApiError.notFound('Event type not found.');
  }

  res.json({
    success: true,
    data: {
      date,
      timezone,
      eventType: {
        title: result.eventType.title,
        durationMinutes: result.eventType.durationMinutes,
        slug: result.eventType.slug,
      },
      slots: result.slots,
    },
  });
}

/**
 * POST /api/booking/:slug/book — Create a new booking.
 */
export async function book(req, res) {
  const { inviteeName, inviteeEmail, startUtc, endUtc } = req.body;

  if (!inviteeName || !inviteeEmail || !startUtc || !endUtc) {
    throw ApiError.badRequest(
      'inviteeName, inviteeEmail, startUtc, and endUtc are required.'
    );
  }

  const booking = await bookingService.createBooking(req.params.slug, req.body);

  res.status(201).json({ success: true, data: booking });
}
