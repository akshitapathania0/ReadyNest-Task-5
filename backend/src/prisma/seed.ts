import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Tenant 1: Acme Corp ────────────────────────────────────────────────
  const acme = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Corp', slug: 'acme', plan: 'ENTERPRISE' },
  });

  const hash = await bcrypt.hash('password', 12);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: acme.id, email: 'admin@acme.com' } },
    update: {},
    create: { tenantId: acme.id, email: 'admin@acme.com', name: 'Jordan Davis',
      passwordHash: hash, role: 'ADMIN', emailVerified: true },
  });

  const member = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: acme.id, email: 'member@acme.com' } },
    update: {},
    create: { tenantId: acme.id, email: 'member@acme.com', name: 'Sam Park',
      passwordHash: hash, role: 'MEMBER', emailVerified: true },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: acme.id, email: 'viewer@acme.com' } },
    update: {},
    create: { tenantId: acme.id, email: 'viewer@acme.com', name: 'Alex Chen',
      passwordHash: hash, role: 'VIEWER', emailVerified: true },
  });

  // ── Projects ───────────────────────────────────────────────────────────
  const p1 = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: { id: 'seed-project-1', tenantId: acme.id, name: 'Marketing Hub',
      description: 'Central hub for all marketing campaigns', status: 'ACTIVE', progress: 72,
      dueDate: new Date('2025-08-30'),
      members: { create: [{ userId: admin.id, role: 'owner' }, { userId: member.id, role: 'member' }] } },
  });

  await prisma.project.upsert({
    where: { id: 'seed-project-2' },
    update: {},
    create: { id: 'seed-project-2', tenantId: acme.id, name: 'API Revamp',
      description: 'Full API redesign with REST best practices', status: 'IN_REVIEW', progress: 45,
      dueDate: new Date('2025-09-15'),
      members: { create: [{ userId: admin.id, role: 'owner' }] } },
  });

  await prisma.project.upsert({
    where: { id: 'seed-project-3' },
    update: {},
    create: { id: 'seed-project-3', tenantId: acme.id, name: 'Mobile App v3',
      description: 'Next generation mobile experience', status: 'PLANNING', progress: 18,
      members: { create: [{ userId: member.id, role: 'owner' }] } },
  });

  // ── Audit logs ─────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    skipDuplicates: true,
    data: [
      { tenantId: acme.id, userId: admin.id, action: 'auth.login', resource: 'user',
        resourceId: admin.id, details: {}, ipAddress: '127.0.0.1' },
      { tenantId: acme.id, userId: admin.id, action: 'project.create', resource: 'project',
        resourceId: p1.id, details: { name: 'Marketing Hub' } },
    ],
  });

  // ── Tenant 2: TechStart ────────────────────────────────────────────────
  const techstart = await prisma.tenant.upsert({
    where: { slug: 'techstart' },
    update: {},
    create: { name: 'TechStart Inc', slug: 'techstart', plan: 'PRO' },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: techstart.id, email: 'admin@techstart.com' } },
    update: {},
    create: { tenantId: techstart.id, email: 'admin@techstart.com', name: 'Morgan Lee',
      passwordHash: hash, role: 'ADMIN', emailVerified: true },
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Tenant: acme    | admin@acme.com   | password  | Admin');
  console.log('  Tenant: acme    | member@acme.com  | password  | Member');
  console.log('  Tenant: acme    | viewer@acme.com  | password  | Viewer');
  console.log('  Tenant: techstart | admin@techstart.com | password | Admin');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
