import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

/**
 * Global Express error handler.
 * Must have 4 parameters for Express to recognise it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // If it's a known ApiError, use its status code
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.statusCode,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Prisma known request errors (e.g. unique constraint violation)
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 409,
        message: 'A record with that value already exists.',
        details: err.meta?.target || null,
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 404,
        message: 'Record not found.',
        details: null,
      },
    });
  }

  // Unknown errors
  console.error('Unhandled error:', err);

  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(500).json({
    success: false,
    error: {
      code: 500,
      message,
      details: env.NODE_ENV === 'production' ? null : err.stack,
    },
  });
};

export default errorHandler;
