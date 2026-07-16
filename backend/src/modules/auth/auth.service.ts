import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { AppError } from '../../utils/AppError';
import { AuthPayload } from '../../middleware/auth';

const ACCESS_EXPIRES  = '15m';
const REFRESH_EXPIRES = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Token factories ───────────────────────────────────────────────────────
function signAccess(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRES });
}

async function issueRefreshToken(userId: string): Promise<string> {
  const token = uuid();
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES * 1000);

  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });

  // Also cache in Redis for fast invalidation
  await redis.setex(`refresh:${token}`, REFRESH_EXPIRES, userId);

  return token;
}

// ── Register ──────────────────────────────────────────────────────────────
export async function register(data: {
  tenantName: string;
  email: string;
  password: string;
  name: string;
}) {
  // Create slug from tenant name
  const slug = data.tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new AppError('Organization slug already taken', 409);

  const passwordHash = await bcrypt.hash(data.password, 12);

  // Atomic: create tenant + first admin user together
  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: data.tenantName, slug },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: data.email,
        name: data.name,
        passwordHash,
        role: 'ADMIN',
        emailVerified: false,
      },
    });

    return { tenant, user };
  });

  const payload: AuthPayload = {
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: result.user.role,
    email: result.user.email,
  };

  return {
    accessToken: signAccess(payload),
    refreshToken: await issueRefreshToken(result.user.id),
    user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
    tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
  };
}

// ── Login ─────────────────────────────────────────────────────────────────
export async function login(email: string, password: string, tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
  });
  if (!tenant) throw new AppError('Organization not found', 404);

  const user = await prisma.user.findFirst({
    where: { email, tenantId: tenant.id, isActive: true },
  });
  if (!user) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  // Update last login
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const payload: AuthPayload = {
    userId: user.id, tenantId: tenant.id, role: user.role, email: user.email,
  };

  return {
    accessToken: signAccess(payload),
    refreshToken: await issueRefreshToken(user.id),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
  };
}

// ── Refresh ───────────────────────────────────────────────────────────────
export async function refresh(token: string) {
  // Check Redis first (fast path); fall back to DB
  const cachedUserId = await redis.get(`refresh:${token}`);
  const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });

  if (!stored || stored.expiresAt < new Date()) {
    await redis.del(`refresh:${token}`);
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const { user } = stored;

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { token } });
  await redis.del(`refresh:${token}`);

  const payload: AuthPayload = {
    userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email,
  };

  return {
    accessToken: signAccess(payload),
    refreshToken: await issueRefreshToken(user.id),
  };
}

// ── Logout ────────────────────────────────────────────────────────────────
export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
  await redis.del(`refresh:${token}`);
}
