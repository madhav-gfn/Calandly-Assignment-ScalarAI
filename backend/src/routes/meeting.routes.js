import { Router } from 'express';
import * as meetingController from '../controllers/meeting.controller.js';
import attachUser from '../middleware/attachUser.js';

const router = Router();

// All meeting routes require an authenticated user
router.use(attachUser);

router.get('/', meetingController.list);
router.get('/:id', meetingController.getOne);
router.patch('/:id/cancel', meetingController.cancel);
router.post('/:id/reschedule', meetingController.reschedule);

export default router;
