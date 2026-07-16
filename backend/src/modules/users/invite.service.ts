import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { logAudit } from '../audit/audit.service';

// ── INVITE FLOW ───────────────────────────────────────────────────────────

export async function createInvite(
  tenantId: string,
  invitedBy: string,
  email: string,
  role: 'MEMBER' | 'VIEWER' | 'ADMIN'
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError('Tenant not found', 404);

  const existing = await prisma.user.findFirst({ where: { tenantId, email } });
  if (existing) throw new AppError('This email is already a member', 409);

  await prisma.invite.updateMany({
    where: { tenantId, email, status: 'PENDING' },
    data: { status: 'REVOKED' },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: { tenantId, email, role, invitedBy, expiresAt },
  });

  const acceptLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite?token=${invite.token}`;

  return { invite, acceptLink };
}

export async function listInvites(tenantId: string) {
  return prisma.invite.findMany({
    where: { tenantId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeInvite(tenantId: string, inviteId: string) {
  const invite = await prisma.invite.findFirst({ where: { id: inviteId, tenantId } });
  if (!invite) throw new AppError('Invite not found', 404);
  return prisma.invite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } });
}

export async function acceptInvite(token: string, name: string, password: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) throw new AppError('Invalid invite link', 404);
  if (invite.status !== 'PENDING') throw new AppError(`Invite is ${invite.status.toLowerCase()}`, 400);
  if (invite.expiresAt < new Date()) {
    await prisma.invite.update({ where: { token }, data: { status: 'EXPIRED' } });
    throw new AppError('Invite link has expired', 400);
  }

  const existing = await prisma.user.findFirst({
    where: { tenantId: invite.tenantId, email: invite.email },
  });
  if (existing) throw new AppError('Email already registered in this organization', 409);

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        tenantId: invite.tenantId,
        email: invite.email,
        name,
        passwordHash,
        role: invite.role,
        emailVerified: true,
      },
    }),
    prisma.invite.update({
      where: { token },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    }),
  ]);

  await logAudit({
    tenantId: invite.tenantId,
    userId: user.id,
    action: 'auth.invite_accepted',
    resource: 'user',
    resourceId: user.id,
    details: { email: user.email, role: user.role },
  });

  return { user, tenantId: invite.tenantId };
}

export async function getInviteByToken(token: string) {
  console.log('Looking for token:', token); 
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { tenant: { select: { name: true, slug: true } } },
  });
  console.log('Found invite:', invite);
  if (!invite) throw new AppError('Invalid invite link', 404);
  if (invite.status !== 'PENDING') throw new AppError(`This invite is ${invite.status.toLowerCase()}`, 400);
  if (invite.expiresAt < new Date()) throw new AppError('This invite has expired', 400);
  return invite;
}

// ── JOIN REQUEST FLOW ─────────────────────────────────────────────────────

export async function createJoinRequest(
  tenantSlug: string,
  name: string,
  email: string,
  password: string,
  role: 'MEMBER' | 'VIEWER',
  message?: string
) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, isActive: true } });
  if (!tenant) throw new AppError('Organization not found', 404);

  const existingUser = await prisma.user.findFirst({ where: { tenantId: tenant.id, email } });
  if (existingUser) throw new AppError('This email is already a member', 409);

  const existingRequest = await prisma.joinRequest.findFirst({
    where: { tenantId: tenant.id, email, status: 'PENDING' },
  });
  if (existingRequest) throw new AppError('You already have a pending request for this organization', 409);

  const passwordHash = await bcrypt.hash(password, 12);

  const request = await prisma.joinRequest.create({
    data: { tenantId: tenant.id, name, email, passwordHash, role, message },
  });

  return { request, tenant: { name: tenant.name, slug: tenant.slug } };
}

export async function listJoinRequests(tenantId: string, status?: string) {
  return prisma.joinRequest.findMany({
    where: { tenantId, ...(status && { status: status as any }) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveJoinRequest(
  tenantId: string,
  requestId: string,
  reviewerId: string
) {
  const request = await prisma.joinRequest.findFirst({ where: { id: requestId, tenantId } });
  if (!request) throw new AppError('Request not found', 404);
  if (request.status !== 'PENDING') throw new AppError('Request already reviewed', 400);

  // Check not already a user (edge case)
  const existing = await prisma.user.findFirst({ where: { tenantId, email: request.email } });
  if (existing) {
    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    throw new AppError('This email is already a member', 409);
  }

  // Create user account directly using the password they set on signup
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        tenantId,
        email: request.email,
        name: request.name,
        passwordHash: request.passwordHash,
        role: request.role,
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date() },
    }),
  ]);

  await logAudit({
    tenantId, userId: reviewerId,
    action: 'join_request.approved', resource: 'join_request', resourceId: requestId,
    details: { email: request.email, role: request.role },
  });

  return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, request };
}

export async function rejectJoinRequest(
  tenantId: string,
  requestId: string,
  reviewerId: string
) {
  const request = await prisma.joinRequest.findFirst({ where: { id: requestId, tenantId } });
  if (!request) throw new AppError('Request not found', 404);
  if (request.status !== 'PENDING') throw new AppError('Request already reviewed', 400);

  await prisma.joinRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED', reviewedBy: reviewerId, reviewedAt: new Date() },
  });

  await logAudit({
    tenantId, userId: reviewerId,
    action: 'join_request.rejected', resource: 'join_request', resourceId: requestId,
    details: { email: request.email },
  });

  return { success: true };
}