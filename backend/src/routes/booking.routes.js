import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';

const router = Router();

// All booking routes are PUBLIC — no auth required

// Event type info for the booking page header
router.get('/:slug', bookingController.getEventInfo);

// Available time slots for a date
router.get('/:slug/slots', bookingController.getSlots);

// Create a booking
router.post('/:slug/book', bookingController.book);

export default router;
