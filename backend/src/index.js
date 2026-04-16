import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import env from './config/env.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import eventTypeRoutes from './routes/eventType.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import meRoutes from './routes/me.routes.js';

// ── Express App ────────────────────────────────────────────────
const app = express();

// ── Security Middleware ────────────────────────────────────────
app.use(helmet());

// Request ID tracking
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Rate limiting for public booking endpoints
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many booking attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Global Middleware ──────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/me', meRoutes);
app.use('/api/event-types', eventTypeRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/booking', bookingLimiter, bookingRoutes);
app.use('/api/meetings', meetingRoutes);

// ── Global Error Handler (must be last) ────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`Server started`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    corsOrigin: env.FRONTEND_URL,
  });
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});

export default app;
