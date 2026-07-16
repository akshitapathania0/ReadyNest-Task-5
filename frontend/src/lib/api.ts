import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`,
  withCredentials: true,
  timeout: 30_000,
});

// Re-attach token on page refresh from localStorage
// The AuthContext sets this on login, but axios loses it on refresh
api.interceptors.request.use((config) => {
  const token = api.defaults.headers.common['Authorization'];
  if (!token) {
    // Try to get from a temp check — AuthContext will set it properly
    const stored = localStorage.getItem('nexaos_access');
    if (stored) {
      config.headers['Authorization'] = `Bearer ${stored}`;
    }
  }
  return config;
});

// ── Request interceptor — attach token ────────────────────────────────────
api.interceptors.request.use((config) => {
  // Token is set globally on login; nothing extra needed here
  return config;
});

// ── Response interceptor — handle 401 → token refresh ────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    const isPublicRoute = originalRequest.url?.includes('/auth/invite/');
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const rt = localStorage.getItem('nexaos_refresh');
        if (!rt) throw new Error('No refresh token');

        const { data } = await api.post('/auth/refresh', { refreshToken: rt });
        const newToken = data.data.accessToken;

        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('nexaos_refresh');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed helper wrappers ─────────────────────────────────────────────────
export const apiClient = {
  // Projects
  projects: {
    list: (params?: Record<string, unknown>) => api.get('/projects', { params }),
    get: (id: string) => api.get(`/projects/${id}`),
    create: (data: unknown) => api.post('/projects', data),
    update: (id: string, data: unknown) => api.patch(`/projects/${id}`, data),
    delete: (id: string) => api.delete(`/projects/${id}`),
  },
  // Users
  users: {
    list: (params?: Record<string, unknown>) => api.get('/users', { params }),
    invite: (data: unknown) => api.post('/users/invite', data),
    update: (id: string, data: unknown) => api.patch(`/users/${id}`, data),
    remove: (id: string) => api.delete(`/users/${id}`),
  },
  // Files
  files: {
    list: (params?: Record<string, unknown>) => api.get('/files', { params }),
    upload: (formData: FormData, onProgress?: (pct: number) => void) =>
      api.post('/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      }),
    delete: (id: string) => api.delete(`/files/${id}`),
    getSignedUrl: (folder?: string) => api.post('/files/signed-url', { folder }),
  },
  // Audit
  audit: {
    list: (params?: Record<string, unknown>) => api.get('/audit', { params }),
  },
};
