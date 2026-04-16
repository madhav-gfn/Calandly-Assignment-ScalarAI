import { getAvailableSlots } from '../services/slotEngine.js';
import * as bookingService from '../services/booking.service.js';
import ApiError from '../utils/ApiError.js';

function getPublicLookup(params) {
  if (params.username) {
    return {
      username: params.username,
      slug: params.slug,
    };
  }

  return { slug: params.slug };
}

/**
 * GET /api/booking/:slug or /api/booking/:username/:slug
 */
export async function getEventInfo(req, res) {
  const eventType = await bookingService.getPublicEventType(getPublicLookup(req.params));
  res.json({ success: true, data: eventType });
}

/**
 * GET /api/booking/:slug/month-slots or /api/booking/:username/:slug/month-slots
 * Returns available slots for entire month.
 */
export async function getMonthSlots(req, res) {
  const { month, timezone } = req.query;

  if (!month) {
    throw ApiError.badRequest('Query parameter "month" is required (YYYY-MM).');
  }

  if (!timezone) {
    throw ApiError.badRequest('Query parameter "timezone" is required (e.g. Asia/Kolkata).');
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw ApiError.badRequest('Invalid month format. Use YYYY-MM.');
  }

  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return `${year}-${String(monthNum).padStart(2, '0')}-${day}`;
  });

  const result = await Promise.all(
    dates.map((date) => getAvailableSlots(getPublicLookup(req.params), date, timezone))
  );

  const eventType = result[0]?.eventType;
  if (!eventType) {
    throw ApiError.notFound('Event type not found.');
  }

  const slotsByDate = {};
  dates.forEach((date, i) => {
    slotsByDate[date] = result[i].slots;
  });

  res.json({
    success: true,
    data: {
      month,
      timezone,
      eventType: {
        title: eventType.title,
        durationMinutes: eventType.durationMinutes,
        slug: eventType.slug,
        username: eventType.user.username,
      },
      slotsByDate,
    },
  });
}

/**
 * GET /api/booking/:slug/slots or /api/booking/:username/:slug/slots
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

  const result = await getAvailableSlots(getPublicLookup(req.params), date, timezone);

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
        username: result.eventType.user.username,
      },
      slots: result.slots,
    },
  });
}

/**
 * POST /api/booking/:slug/book or /api/booking/:username/:slug/book
 */
export async function book(req, res) {
  const { inviteeName, inviteeEmail, startUtc, endUtc } = req.body;

  if (!inviteeName || !inviteeEmail || !startUtc || !endUtc) {
    throw ApiError.badRequest(
      'inviteeName, inviteeEmail, startUtc, and endUtc are required.'
    );
  }

  const booking = await bookingService.createBooking(getPublicLookup(req.params), req.body);

  res.status(201).json({ success: true, data: booking });
}
