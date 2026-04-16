import { Router } from 'express';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        database: 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      error: {
        code: 503,
        message: 'Service unavailable',
      },
    });
  }
});

export default router;
