// backend/src/index.ts
// Changes from local version:
//   1. Use process.env.PORT (Render injects this as 10000)
//   2. Bind to '0.0.0.0' explicitly (required on Render)
//   3. SIGTERM handler for graceful shutdown during deploys
//   4. Socket.io cors origin reads from CLIENT_URL env (set by render.yaml)

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { prisma } from './config/database';
import { redis } from './config/redis';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { tenantMiddleware } from './middleware/tenant';
import { setupSocketHandlers } from './modules/realtime/socket.handlers';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import projectRoutes from './modules/projects/projects.routes';
import fileRoutes from './modules/files/files.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();
const httpServer = createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
// cors origin must match your frontend's Render URL (set via CLIENT_URL env)
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL].filter(Boolean) as string[]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

export const io = new SocketServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
  path: '/socket.io',
});

setupSocketHandlers(io);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));

// Trust Render's proxy so req.ip works correctly for audit logs
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Parsers ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Tenant ────────────────────────────────────────────────────────────────
app.use('/api/', tenantMiddleware);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/audit', auditRoutes);

// ── Health check — Render pings this to verify the service is alive ───────
app.get('/health', async (_req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(r => r === 'PONG').catch(() => false);
  const status = dbOk && redisOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    db: dbOk,
    redis: redisOk,
    ts: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Error handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start — bind 0.0.0.0 so Render's network can reach the process ────────
// Render injects PORT=10000; local dev defaults to 4000
const PORT = parseInt(process.env.PORT || '4000', 10);

httpServer.listen(PORT, '0.0.0.0', async () => {
  await prisma.$connect();
  logger.info(`NexaOS API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// ── Graceful shutdown — Render sends SIGTERM before stopping an instance ──
// You have up to 30 seconds to finish in-flight requests before hard kill.
async function shutdown(signal: string) {
  logger.info(`${signal} received — starting graceful shutdown`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close all Socket.io connections gracefully
      io.close(() => logger.info('Socket.io closed'));

      // Disconnect from DB and Redis
      await prisma.$disconnect();
      logger.info('Prisma disconnected');

      await redis.quit();
      logger.info('Redis disconnected');

      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit if shutdown takes > 25 seconds (under Render's 30s limit)
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 25_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
