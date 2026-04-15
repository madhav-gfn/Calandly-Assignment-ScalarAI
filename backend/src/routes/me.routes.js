import { Router } from 'express';
import * as meController from '../controllers/me.controller.js';
import attachUser from '../middleware/attachUser.js';
import { validate } from '../middleware/validate.js';
import { isValidSlug } from '../utils/slugify.js';
import { isValidTimezone } from '../utils/dateHelpers.js';

const router = Router();

router.use(attachUser);

const updateSchema = {
  name: { required: false, type: 'string', min: 1, max: 100 },
  username: {
    required: false,
    type: 'string',
    custom: (value) => !value || isValidSlug(value),
    customMsg: 'username must be lowercase alphanumeric with hyphens only.',
  },
  timezone: {
    required: false,
    type: 'string',
    custom: (value) => !value || isValidTimezone(value),
    customMsg: 'timezone must be a valid IANA timezone.',
  },
};

router.get('/', meController.getCurrent);
router.put('/', validate(updateSchema), meController.updateCurrent);

export default router;
