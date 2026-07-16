import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import * as projectsService from './projects.service';
import { logAudit } from '../audit/audit.service';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'IN_REVIEW', 'COMPLETED', 'ARCHIVED']).optional(),
  dueDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  memberIds: z.array(z.string().uuid()).optional(),
});

const updateSchema = createSchema.partial().omit({ memberIds: true }).extend({
  progress: z.number().min(0).max(100).optional(),
});

// GET /api/projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, status, sortBy, sortDir } = req.query as Record<string, string>;
    const result = await projectsService.listProjects(req.user!.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status: status as any,
      sortBy: sortBy as any,
      sortDir: sortDir as any,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectsService.getProject(req.user!.tenantId, req.params.id);
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    const project = await projectsService.createProject(req.user!.tenantId, req.user!.userId, data);
    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'project.create', resource: 'project', resourceId: project.id,
      details: { name: project.name }, req });
    res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
});

// PATCH /api/projects/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateSchema.parse(req.body);
    const project = await projectsService.updateProject(
      req.user!.tenantId, req.params.id, req.user!.userId, data as any);
    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'project.update', resource: 'project', resourceId: project.id,
      details: data as any, req });
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id (Admin only)
router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await projectsService.deleteProject(req.user!.tenantId, req.params.id, req.user!.userId);
    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'project.delete', resource: 'project', resourceId: req.params.id, req });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
