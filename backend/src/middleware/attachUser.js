import env from '../config/env.js';

/**
 * Middleware that attaches the default user ID to every request.
 * In the future, this can be replaced with JWT-based auth.
 */
const attachUser = (req, _res, next) => {
  req.userId = env.DEFAULT_USER_ID;
  next();
};

export default attachUser;
