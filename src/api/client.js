const DEFAULT_BASE = 'https://topik-backend-1.onrender.com';

import { getResolvedDevPort } from './devPort';
import { clearAuth, getAuthHeaders } from './auth';

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    return '';
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:${import.meta.env.VITE_API_PORT || '8080'}`;
    }
  }

  return DEFAULT_BASE;
}

export function getDirectDevApiBaseUrl() {
  const port = getResolvedDevPort();
  return `http://127.0.0.1:${port}`;
}

export function apiUrl(path) {
  const base = getApiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

export async function apiFetch(path, options = {}) {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const headers = {
    ...(fetchOptions.headers || {}),
    ...getAuthHeaders(),
  };
  const res = await fetch(apiUrl(path), { ...fetchOptions, headers });
  if (res.status === 401 && !skipAuthRedirect && typeof window !== 'undefined') {
    clearAuth();
    const path = window.location.pathname;
    if (path !== '/' && path !== '') {
      window.location.href = '/';
    }
  }
  return res;
}
