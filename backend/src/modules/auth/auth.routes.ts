import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { authenticate } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import * as inviteService from '../users/invite.service';

const router = Router();

const registerSchema = z.object({
  tenantName: z.string().min(2).max(64),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
});

// POST /api/auth/register — create new org
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    await logAudit({ tenantId: result.tenant.id, userId: result.user.id,
      action: 'auth.register', resource: 'tenant', resourceId: result.tenant.id,
      details: { tenantName: result.tenant.name }, req });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password, data.tenantSlug);
    await logAudit({ tenantId: result.tenant.id, userId: result.user.id,
      action: 'auth.login', resource: 'user', resourceId: result.user.id, req });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: { message: 'refreshToken required' } });
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true,
        tenant: { select: { id: true, name: true, slug: true, plan: true } } },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// POST /api/auth/join-request — anyone submits a request to join an org
router.post('/join-request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantSlug, name, email, password, role, message } = z.object({
      tenantSlug: z.string().min(1),
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['MEMBER', 'VIEWER']).default('MEMBER'),
      message: z.string().max(300).optional(),
    }).parse(req.body);

    const result = await inviteService.createJoinRequest(tenantSlug, name, email, password, role, message);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/auth/invite/:token — get invite info (public, for accept page)
router.get('/invite/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invite = await inviteService.getInviteByToken(req.params.token);
    res.json({ success: true, data: invite });
  } catch (err) { next(err); }
});

// POST /api/auth/invite/:token/accept — member accepts invite and sets password
router.post('/invite/:token/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, password } = z.object({
      name: z.string().min(1),
      password: z.string().min(8),
    }).parse(req.body);

    const { user, tenantId } = await inviteService.acceptInvite(req.params.token, name, password);
    res.json({ success: true, data: { user, message: 'Account created! You can now sign in.' } });
  } catch (err) { next(err); }
});

export default router;