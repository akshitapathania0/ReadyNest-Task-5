import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from './auth';

// Resolves tenantId from the JWT (if present) and attaches it to req.
// Routes that require auth will re-verify the full token via authenticate().
// This middleware just makes tenantId available early for logging/rate limiting.
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const payload = jwt.decode(token) as AuthPayload | null;
      if (payload?.tenantId) {
        req.tenantId = payload.tenantId;
      }
    }

    // Also accept explicit x-tenant-id header (for API key auth flows)
    if (!req.tenantId && req.headers['x-tenant-id']) {
      req.tenantId = req.headers['x-tenant-id'] as string;
    }
  } catch {
    // Non-fatal — routes that need tenantId will enforce it themselves
  }
  next();
}
