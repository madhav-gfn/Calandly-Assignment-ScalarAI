import { Router } from 'express';
import * as availabilityController from '../controllers/availability.controller.js';
import attachUser from '../middleware/attachUser.js';

const router = Router();

// All availability routes require an authenticated user
router.use(attachUser);

// ── Schedules ──────────────────────────────────────────────────
router.get('/schedules', availabilityController.listSchedules);
router.get('/schedules/:id', availabilityController.getSchedule);
router.post('/schedules', availabilityController.createSchedule);
router.put('/schedules/:id', availabilityController.updateSchedule);
router.delete('/schedules/:id', availabilityController.deleteSchedule);

// ── Rules (bulk replace) ───────────────────────────────────────
router.put('/schedules/:id/rules', availabilityController.replaceRules);

// ── Overrides ──────────────────────────────────────────────────
router.get('/schedules/:id/overrides', availabilityController.listOverrides);
router.post('/schedules/:id/overrides', availabilityController.createOverride);
router.delete('/overrides/:id', availabilityController.deleteOverride);

export default router;
