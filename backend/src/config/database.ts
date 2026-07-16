import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Reuse client in development to avoid exhausting connection pool on hot reload
export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;

  // Log slow queries in dev
  (prisma as any).$on('query', (e: any) => {
    if (e.duration > 1000) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}
