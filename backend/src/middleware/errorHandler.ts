import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // AppError: intentional, known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        fields: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      },
    });
  }

  // Prisma constraint violations
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { message: 'Resource already exists', code: 'CONFLICT' },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource not found', code: 'NOT_FOUND' },
      });
    }
  }

  // Unexpected errors — log full stack
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    tenantId: req.user?.tenantId,
    userId: req.user?.userId,
  });

  // Never expose internals in production
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
    },
  });
}
