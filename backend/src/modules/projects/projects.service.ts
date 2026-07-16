import { Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { io } from '../../index';

export interface ProjectsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'dueDate' | 'progress';
  sortDir?: 'asc' | 'desc';
}

// ── List projects (paginated, filtered, sorted) ───────────────────────────
export async function listProjects(tenantId: string, query: ProjectsQuery) {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    sortBy = 'updatedAt',
    sortDir = 'desc',
  } = query;

  const where: Prisma.ProjectWhereInput = {
    tenantId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        _count: { select: { files: true } },
      },
    }),
  ]);

  return {
    data: projects,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// ── Create project ────────────────────────────────────────────────────────
export async function createProject(
  tenantId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    status?: ProjectStatus;
    dueDate?: Date;
    memberIds?: string[];
  }
) {
  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        status: data.status || 'PLANNING',
        dueDate: data.dueDate,
        members: {
          create: [
            { userId, role: 'owner' },
            ...(data.memberIds?.filter(id => id !== userId).map(id => ({ userId: id, role: 'member' })) || []),
          ],
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });
    return p;
  });

  // Emit real-time event to all tenant members
  io.to(`tenant:${tenantId}`).emit('project:created', {
    project: { id: project.id, name: project.name },
    actor: userId,
    ts: new Date().toISOString(),
  });

  return project;
}

// ── Update project ────────────────────────────────────────────────────────
export async function updateProject(
  tenantId: string,
  projectId: string,
  userId: string,
  data: Partial<{ name: string; description: string; status: ProjectStatus; dueDate: Date; progress: number }>
) {
  const existing = await prisma.project.findFirst({ where: { id: projectId, tenantId } });
  if (!existing) throw new AppError('Project not found', 404);

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { ...data, updatedAt: new Date() },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  // Emit update event
  io.to(`tenant:${tenantId}`).emit('project:updated', {
    project: { id: updated.id, name: updated.name, status: updated.status },
    actor: userId,
    ts: new Date().toISOString(),
  });

  return updated;
}

// ── Delete project ────────────────────────────────────────────────────────
export async function deleteProject(tenantId: string, projectId: string, userId: string) {
  const existing = await prisma.project.findFirst({ where: { id: projectId, tenantId } });
  if (!existing) throw new AppError('Project not found', 404);

  await prisma.project.delete({ where: { id: projectId } });

  io.to(`tenant:${tenantId}`).emit('project:deleted', {
    projectId,
    actor: userId,
    ts: new Date().toISOString(),
  });
}

// ── Get single project ────────────────────────────────────────────────────
export async function getProject(tenantId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } } },
      files: { orderBy: { createdAt: 'desc' }, take: 10 },
      _count: { select: { files: true, members: true } },
    },
  });

  if (!project) throw new AppError('Project not found', 404);
  return project;
}
