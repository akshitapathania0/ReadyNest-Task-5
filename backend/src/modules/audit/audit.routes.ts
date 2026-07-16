import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getAuditLogs } from './audit.service';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN', 'SUPER_ADMIN')); // Only admins can view audit logs

// GET /api/audit
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, userId, action, resource, from, to } = req.query as Record<string, string>;
    const result = await getAuditLogs(req.user!.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      userId,
      action,
      resource,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

export default router;
