import { z } from 'zod';

// Event Type Schemas
export const createEventTypeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  durationMinutes: z.number().int().min(5, 'Minimum 5 minutes').max(480, 'Maximum 8 hours'),
  description: z.string().optional(),
  meetingMode: z.enum(['google_meet', 'zoom', 'in_person', 'phone']),
  bufferBeforeMin: z.number().int().min(0).max(60).default(0),
  bufferAfterMin: z.number().int().min(0).max(60).default(0),
  isActive: z.boolean().default(true),
});

export const updateEventTypeSchema = createEventTypeSchema.partial();

// Booking Schemas
export const createBookingSchema = z.object({
  inviteeName: z.string().min(1, 'Name is required'),
  inviteeEmail: z.string().email('Valid email required'),
  startUtc: z.string().datetime('Valid ISO datetime required'),
  endUtc: z.string().datetime('Valid ISO datetime required'),
  responses: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      sortOrder: z.number().int(),
      isRequired: z.boolean(),
    })
  ).optional(),
});

// Schedule Schemas
export const createScheduleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  isDefault: z.boolean().default(false),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export const replaceRulesSchema = z.object({
  rules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
    })
  ),
});

// Override Schemas
export const createOverrideSchema = z.object({
  overrideDate: z.string().datetime('Valid ISO datetime required'),
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  note: z.string().max(500).optional(),
});

// Meeting Schemas
export const cancelMeetingSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason required').max(500),
});

export const rescheduleMeetingSchema = z.object({
  startUtc: z.string().datetime('Valid ISO datetime required'),
  endUtc: z.string().datetime('Valid ISO datetime required'),
});

// User Schemas
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z.string().regex(/^[a-z0-9-]+$/).optional(),
  timezone: z.string().optional(),
});
