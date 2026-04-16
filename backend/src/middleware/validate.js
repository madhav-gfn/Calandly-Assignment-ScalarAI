import { ZodError } from 'zod';
import logger from '../utils/logger.js';

/**
 * Middleware factory that validates request body against a Zod schema.
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation failed', {
          path: req.path,
          errors: error.errors,
        });
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
      }
      next(error);
    }
  };
}
