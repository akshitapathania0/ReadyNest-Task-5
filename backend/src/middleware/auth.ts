import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      tenantId?: string;
    }
  }
}

// ── Verify JWT access token ────────────────────────────────────────────────
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;

    // Ensure user still exists and belongs to claimed tenant
    const user = await prisma.user.findFirst({
      where: { id: payload.userId, tenantId: payload.tenantId, isActive: true },
      select: { id: true, role: true, tenantId: true, email: true },
    });

    if (!user) throw new AppError('User not found or inactive', 401);

    req.user = { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(err);
  }
};

// ── Role-based access guard factory ───────────────────────────────────────
// Usage: router.delete('/:id', authenticate, requireRole('ADMIN'), handler)
export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Required role: ${roles.join(' or ')}`, 403));
    }
    next();
  };
};

// ── Tenant data isolation guard ───────────────────────────────────────────
// Ensures the resource being accessed belongs to the authenticated tenant
export const requireTenantOwnership = (getTenantId: (req: Request) => string | undefined) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    const resourceTenantId = getTenantId(req);
    if (resourceTenantId && resourceTenantId !== req.user.tenantId) {
      return next(new AppError('Access denied to this tenant resource', 403));
    }
    next();
  };
};
