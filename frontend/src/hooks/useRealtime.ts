import { useEffect, useRef, useState } from 'react';
import { socketManager } from '../lib/socket';

// Generic hook to subscribe to a socket.io event
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const cleanup = socketManager.on(event, (data) => handlerRef.current(data as T));
    return cleanup;
  }, [event]);
}

// Track live event feed (newest first, capped at maxEvents)
export function useEventFeed(maxEvents = 50) {
  const [events, setEvents] = useState<Array<{ id: string; event: string; data: unknown; ts: Date }>>([]);

  const TRACKED = [
    'project:created', 'project:updated', 'project:deleted',
    'file:uploaded', 'file:deleted',
    'user:online', 'user:offline',
  ];

  useEffect(() => {
    const cleanups = TRACKED.map((event) =>
      socketManager.on(event, (data) => {
        setEvents((prev) => [
          { id: `${Date.now()}-${Math.random()}`, event, data, ts: new Date() },
          ...prev.slice(0, maxEvents - 1),
        ]);
      })
    );
    return () => cleanups.forEach((fn) => fn());
  }, [maxEvents]);

  return events;
}

// Track online presence count
export function usePresence() {
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(socketManager.connected);

  useEffect(() => {
    const cleanups = [
      socketManager.on('presence:update', (data: any) => setOnlineCount(data.onlineCount)),
      socketManager.on('connect', () => setIsConnected(true)),
      socketManager.on('disconnect', () => setIsConnected(false)),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return { onlineCount, isConnected };
}

// Notify when a specific resource changes in real-time
export function useResourceUpdates(
  resourceType: 'project' | 'file',
  onUpdate?: (data: unknown) => void,
  onDelete?: (data: unknown) => void,
  onCreate?: (data: unknown) => void
) {
  useSocketEvent(`${resourceType}:updated`, (data) => onUpdate?.(data));
  useSocketEvent(`${resourceType}:deleted`, (data) => onDelete?.(data));
  useSocketEvent(`${resourceType}:created`, (data) => onCreate?.(data));
}
