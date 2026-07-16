import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { logAudit } from '../audit/audit.service';
import * as inviteService from './invite.service';

const router = Router();
router.use(authenticate);

// GET /api/users — list org members
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search, role } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {
      tenantId: req.user!.tenantId,
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true },
      }),
    ]);
    res.json({ success: true, data: users, meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// ── INVITE ROUTES ──────────────────────────────────────────────────────────

// GET /api/users/invites — list pending invites (admin)
router.get('/invites', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invites = await inviteService.listInvites(req.user!.tenantId);
    res.json({ success: true, data: invites });
  } catch (err) { next(err); }
});

// POST /api/users/invite — admin sends invite
router.post('/invite', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role = 'MEMBER' } = z.object({
      email: z.string().email(),
      role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
    }).parse(req.body);

    const { invite, acceptLink } = await inviteService.createInvite(
      req.user!.tenantId, req.user!.userId, email, role as any
    );

    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'user.invite', resource: 'invite', resourceId: invite.id,
      details: { email, role }, req });

    res.status(201).json({ success: true, data: { invite, acceptLink } });
  } catch (err) { next(err); }
});

// DELETE /api/users/invites/:id — revoke invite
router.delete('/invites/:id', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await inviteService.revokeInvite(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── JOIN REQUEST ROUTES ────────────────────────────────────────────────────

// GET /api/users/join-requests — admin lists requests
router.get('/join-requests', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as Record<string, string>;
    const requests = await inviteService.listJoinRequests(req.user!.tenantId, status);
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

// POST /api/users/join-requests/:id/approve — admin approves
router.post('/join-requests/:id/approve', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inviteService.approveJoinRequest(
      req.user!.tenantId, req.params.id, req.user!.userId
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/users/join-requests/:id/reject — admin rejects
router.post('/join-requests/:id/reject', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await inviteService.rejectJoinRequest(req.user!.tenantId, req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id — update role
router.patch('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, name, isActive } = req.body;
    const target = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!target) throw new AppError('User not found', 404);
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(role && { role }), ...(name && { name }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'user.update', resource: 'user', resourceId: updated.id,
      details: { changes: { role, name, isActive } }, req });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — remove member
router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.userId) throw new AppError('Cannot remove yourself', 400);
    const target = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!target) throw new AppError('User not found', 404);
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'user.remove', resource: 'user', resourceId: req.params.id,
      details: { email: target.email }, req });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;