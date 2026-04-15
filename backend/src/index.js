import express from 'express';
import cors from 'cors';

import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import eventTypeRoutes from './routes/eventType.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import meetingRoutes from './routes/meeting.routes.js';

// ── Express App ────────────────────────────────────────────────
const app = express();

// ── Global Middleware ──────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/event-types', eventTypeRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/meetings', meetingRoutes);

// ── Global Error Handler (must be last) ────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   CORS origin: ${env.FRONTEND_URL}`);
});

export default app;
