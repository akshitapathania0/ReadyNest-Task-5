import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { socketManager } from '../lib/socket';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  avatarUrl?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  register: (data: { tenantName: string; email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  can: (role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER') => boolean;
}

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1, MEMBER: 2, ADMIN: 3, SUPER_ADMIN: 4,
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'nexaos_refresh';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Persist + restore ─────────────────────────────────────────────────
  useEffect(() => {
    const storedRefresh = localStorage.getItem(STORAGE_KEY);
    if (storedRefresh) {
      const timeout = setTimeout(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState(s => ({ ...s, isLoading: false }));
      }, 5000);
      silentRefresh(storedRefresh).finally(() => clearTimeout(timeout));
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  async function silentRefresh(refreshToken: string): Promise<void> {
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      applyTokens(data.data.accessToken, data.data.refreshToken, data.data.user, data.data.tenant);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setState(s => ({ ...s, isLoading: false }));
    }
  }

  function applyTokens(accessToken: string, refreshToken: string, user: User, tenant: Tenant) {
    localStorage.setItem(STORAGE_KEY, refreshToken);
    localStorage.setItem('nexaos_access', accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    api.defaults.headers.common['x-tenant-id'] = tenant.id;

    setState({ user, tenant, accessToken, isLoading: false, isAuthenticated: true });

    // Connect WebSocket for real-time events
    socketManager.connect(accessToken);

    // Schedule silent token refresh at 14 min (1 min before 15 min expiry)
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      const rt = localStorage.getItem(STORAGE_KEY);
      if (rt) silentRefresh(rt);
    }, 14 * 60 * 1000);
  }

  // ── Login ──────────────────────────────────────────────────────────────
  async function login(email: string, password: string, tenantSlug: string) {
    const { data } = await api.post('/auth/login', { email, password, tenantSlug });
    const result = data.data;
    applyTokens(result.accessToken, result.refreshToken, result.user, result.tenant);
  }

  // ── Register ───────────────────────────────────────────────────────────
  async function register(payload: { tenantName: string; email: string; password: string; name: string }) {
    const { data } = await api.post('/auth/register', payload);
    const result = data.data;
    applyTokens(result.accessToken, result.refreshToken, result.user, result.tenant);
  }

  // ── Logout ─────────────────────────────────────────────────────────────
  async function logout() {
    const rt = localStorage.getItem(STORAGE_KEY);
    try {
      if (rt) await api.post('/auth/logout', { refreshToken: rt });
    } finally {
      clearTimeout(refreshTimerRef.current);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('nexaos_access');
      delete api.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['x-tenant-id'];
      socketManager.disconnect();
      setState({ user: null, tenant: null, accessToken: null, isLoading: false, isAuthenticated: false });
    }
  }

  // ── Token refresh (for axios interceptor) ─────────────────────────────
  async function refreshToken(): Promise<string | null> {
    const rt = localStorage.getItem(STORAGE_KEY);
    if (!rt) return null;
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      const result = data.data;
      applyTokens(result.accessToken, result.refreshToken, state.user!, state.tenant!);
      return data.accessToken;
    } catch {
      await logout();
      return null;
    }
  }

  // ── RBAC helper ────────────────────────────────────────────────────────
  function can(requiredRole: keyof typeof ROLE_HIERARCHY): boolean {
    if (!state.user) return false;
    return (ROLE_HIERARCHY[state.user.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshToken, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
