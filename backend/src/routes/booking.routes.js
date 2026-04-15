import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';

const router = Router();

// Preferred username-aware public booking routes
router.get('/:username/:slug/slots', bookingController.getSlots);
router.post('/:username/:slug/book', bookingController.book);
router.get('/:username/:slug', bookingController.getEventInfo);

// Legacy slug-only routes retained for compatibility
router.get('/:slug/slots', bookingController.getSlots);
router.post('/:slug/book', bookingController.book);
router.get('/:slug', bookingController.getEventInfo);

export default router;
