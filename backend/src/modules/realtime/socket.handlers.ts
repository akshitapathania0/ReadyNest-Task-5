import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { redis } from '../../config/redis';

interface ConnectedUser {
  userId: string;
  tenantId: string;
  role: string;
  name?: string;
  socketId: string;
  joinedAt: Date;
}

// Track online users per tenant in Redis
const ONLINE_PREFIX = 'online:tenant:';

export function setupSocketHandlers(io: Server) {

  // ── Auth middleware for WebSocket connections ────────────────────────────
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token as string, process.env.JWT_SECRET!) as AuthPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;
    const tenantRoom = `tenant:${user.tenantId}`;

    // Join the tenant-scoped room — critical for isolation
    socket.join(tenantRoom);

    const connectedUser: ConnectedUser = {
      userId: user.userId,
      tenantId: user.tenantId,
      role: user.role,
      socketId: socket.id,
      joinedAt: new Date(),
    };

    // Track in Redis (with 1h TTL, refreshed on activity)
    await redis.hset(`${ONLINE_PREFIX}${user.tenantId}`, user.userId, JSON.stringify(connectedUser));
    await redis.expire(`${ONLINE_PREFIX}${user.tenantId}`, 3600);

    logger.info(`Socket connected: ${user.userId} in tenant ${user.tenantId}`);

    // Notify others in tenant of new online user
    socket.to(tenantRoom).emit('user:online', { userId: user.userId, ts: new Date().toISOString() });

    // Broadcast online count
    const onlineCount = await redis.hlen(`${ONLINE_PREFIX}${user.tenantId}`);
    io.to(tenantRoom).emit('presence:update', { onlineCount, tenantId: user.tenantId });

    // ── Event handlers ────────────────────────────────────────────────────

    // User typing in a project (collaborative editing indicator)
    socket.on('typing:start', ({ projectId }: { projectId: string }) => {
      socket.to(tenantRoom).emit('typing:start', { userId: user.userId, projectId });
    });
    socket.on('typing:stop', ({ projectId }: { projectId: string }) => {
      socket.to(tenantRoom).emit('typing:stop', { userId: user.userId, projectId });
    });

    // Cursor position sharing
    socket.on('cursor:move', (data: { projectId: string; x: number; y: number }) => {
      socket.to(tenantRoom).emit('cursor:move', { userId: user.userId, ...data });
    });

    // Ping/pong heartbeat to maintain accurate presence
    socket.on('heartbeat', async () => {
      await redis.hset(`${ONLINE_PREFIX}${user.tenantId}`, user.userId, JSON.stringify({ ...connectedUser, socketId: socket.id }));
      await redis.expire(`${ONLINE_PREFIX}${user.tenantId}`, 3600);
      socket.emit('heartbeat:ack', { ts: Date.now() });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      await redis.hdel(`${ONLINE_PREFIX}${user.tenantId}`, user.userId);

      socket.to(tenantRoom).emit('user:offline', { userId: user.userId, ts: new Date().toISOString() });

      const newCount = await redis.hlen(`${ONLINE_PREFIX}${user.tenantId}`);
      io.to(tenantRoom).emit('presence:update', { onlineCount: newCount, tenantId: user.tenantId });

      logger.info(`Socket disconnected: ${user.userId}`);
    });
  });

  // ── Helper exported for use in services ───────────────────────────────
  return {
    emitToTenant: (tenantId: string, event: string, data: unknown) => {
      io.to(`tenant:${tenantId}`).emit(event, data);
    },
    getOnlineUsers: async (tenantId: string) => {
      const raw = await redis.hgetall(`${ONLINE_PREFIX}${tenantId}`);
      return Object.values(raw || {}).map(v => JSON.parse(v));
    },
  };
}
