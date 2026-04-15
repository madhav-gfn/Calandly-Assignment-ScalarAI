import { Router } from 'express';
import * as eventTypeController from '../controllers/eventType.controller.js';
import { validate } from '../middleware/validate.js';
import { isValidSlug } from '../utils/slugify.js';
import attachUser from '../middleware/attachUser.js';

const router = Router();

// All event type routes require an authenticated user
router.use(attachUser);

// Validation schemas
const createSchema = {
  title: { required: true, type: 'string', min: 1, max: 100 },
  slug: {
    required: true,
    type: 'string',
    custom: isValidSlug,
    customMsg: 'Slug must be lowercase alphanumeric with hyphens, max 100 chars.',
  },
  durationMinutes: { required: true, type: 'number', min: 5, max: 480 },
  description: { required: false, type: 'string', max: 1000 },
  meetingMode: {
    required: false,
    type: 'string',
    enum: ['google_meet', 'zoom', 'in_person', 'phone'],
  },
  bufferBeforeMin: { required: false, type: 'number', min: 0, max: 120 },
  bufferAfterMin: { required: false, type: 'number', min: 0, max: 120 },
};

const updateSchema = {
  title: { required: false, type: 'string', min: 1, max: 100 },
  slug: {
    required: false,
    type: 'string',
    custom: (val) => !val || isValidSlug(val),
    customMsg: 'Slug must be lowercase alphanumeric with hyphens, max 100 chars.',
  },
  durationMinutes: { required: false, type: 'number', min: 5, max: 480 },
  description: { required: false, type: 'string', max: 1000 },
  meetingMode: {
    required: false,
    type: 'string',
    enum: ['google_meet', 'zoom', 'in_person', 'phone'],
  },
  bufferBeforeMin: { required: false, type: 'number', min: 0, max: 120 },
  bufferAfterMin: { required: false, type: 'number', min: 0, max: 120 },
  isActive: { required: false, type: 'boolean' },
};

// Routes
router.get('/', eventTypeController.list);
router.get('/:id', eventTypeController.getOne);
router.post('/', validate(createSchema), eventTypeController.create);
router.put('/:id', validate(updateSchema), eventTypeController.update);
router.delete('/:id', eventTypeController.remove);

export default router;
