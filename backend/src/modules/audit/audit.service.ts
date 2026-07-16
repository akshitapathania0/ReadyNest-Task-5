import { prisma } from '../../config/database';
import { Request } from 'express';

export interface AuditEvent {
  tenantId: string;
  userId?: string;
  action: string;       // e.g. 'project.create', 'user.login', 'file.delete'
  resource: string;     // e.g. 'project', 'user', 'file'
  resourceId?: string;
  details?: Record<string, unknown>;
  req?: Request;
}

// ── Log audit event ───────────────────────────────────────────────────────
export async function logAudit(event: AuditEvent) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details || {},
        ipAddress: event.req?.ip,
        userAgent: event.req?.headers['user-agent'],
      },
    });
  } catch (err) {
    // Audit failures must never crash the main flow
    console.error('[Audit] Failed to write audit log:', err);
  }
}

// ── Query audit logs (paginated + filtered) ───────────────────────────────
export async function getAuditLogs(
  tenantId: string,
  query: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    from?: Date;
    to?: Date;
  }
) {
  const { page = 1, limit = 25, userId, action, resource, from, to } = query;

  const where: any = {
    tenantId,
    ...(userId && { userId }),
    ...(action && { action: { startsWith: action } }),
    ...(resource && { resource }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
  };

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    }),
  ]);

  return {
    data: logs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ── Audit middleware — auto-logs every mutating request ───────────────────
export function auditMiddleware(action: string, resource: string) {
  return async (req: Request, _res: any, next: any) => {
    // Attach audit logger to req so controllers can call req.audit()
    (req as any).audit = (resourceId?: string, details?: Record<string, unknown>) => {
      if (!req.user) return;
      logAudit({
        tenantId: req.user.tenantId,
        userId: req.user.userId,
        action,
        resource,
        resourceId,
        details,
        req,
      });
    };
    next();
  };
}
