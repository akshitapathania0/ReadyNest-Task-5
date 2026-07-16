// backend/src/config/redis.ts
// Render Key Value provides a Redis-compatible URL.
// The URL uses the rediss:// scheme (TLS) for external connections.
// When connecting from within the same Render region via internal URL,
// it uses redis:// (no TLS needed on private network).

import IORedis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

// Parse whether TLS is needed from the URL scheme
const isTLS = REDIS_URL.startsWith('rediss://');

export const redis = new IORedis(REDIS_URL, {
  // ✅ Required if using rediss:// (TLS) — Render's external Redis URL
  tls: isTLS ? { rejectUnauthorized: false } : undefined,

  // Retry with exponential backoff — important for cold starts on Render
  retryStrategy(times) {
    if (times > 10) {
      logger.error('Redis: too many retry attempts, giving up');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis: retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },

  // Don't crash on connection errors — let retryStrategy handle it
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  keepAlive: 30000,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('ready', () => logger.info('Redis ready'));
redis.on('error', (err) => logger.error('Redis error:', err.message));
redis.on('close', () => logger.warn('Redis connection closed'));
redis.on('reconnecting', (delay: number) => logger.warn(`Redis reconnecting in ${delay}ms`));
