import { Router } from 'express';
import * as meetingController from '../controllers/meeting.controller.js';
import attachUser from '../middleware/attachUser.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// All meeting routes require an authenticated user
router.use(attachUser);

const cancelSchema = {
  reason: { required: false, type: 'string', max: 500 },
};

router.get('/', meetingController.list);
router.get('/:id', meetingController.getOne);
router.patch('/:id/cancel', validate(cancelSchema), meetingController.cancel);
router.post('/:id/reschedule', meetingController.reschedule);

export default router;
