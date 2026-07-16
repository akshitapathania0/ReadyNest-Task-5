// frontend/src/lib/socket.ts
// ─── RENDER DEPLOYMENT CHANGE ─────────────────────────────────────────────
//
// Render does NOT support sticky sessions.
// Socket.io's default behaviour is:
//   1. Start with HTTP long-polling
//   2. Upgrade to WebSocket
//
// During step 1, if your backend has >1 instance, the polling requests can
// hit different servers and you get "Session ID unknown" (HTTP 400) errors.
//
// FIX: Force WebSocket-only from the start with transports: ['websocket']
// A single WebSocket connection doesn't need sticky sessions.
// ──────────────────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';

type EventHandler = (...args: unknown[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },

      // ✅ KEY CHANGE FOR RENDER: force WebSocket-only, skip polling handshake
      transports: ['websocket'],

      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      // Socket.io auto-reconnects; no manual action needed
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Re-attach all registered handlers after reconnect
    this.handlers.forEach((fns, event) => {
      fns.forEach(fn => this.socket?.on(event, fn));
    });
  }

  disconnect() {
    this.heartbeatTimer && clearInterval(this.heartbeatTimer);
    this.socket?.disconnect();
    this.socket = null;
    this.handlers.clear();
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    this.socket?.on(event, handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  emit(event: string, data?: unknown) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Tried to emit while disconnected:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  get connected() {
    return this.socket?.connected ?? false;
  }

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private startHeartbeat() {
    this.heartbeatTimer && clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.socket?.emit('heartbeat');
    }, 25_000); // 25s — under Render's idle timeout
  }
}

export const socketManager = new SocketManager();
