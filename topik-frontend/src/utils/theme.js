const STORAGE_KEY = 'topik_theme';

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function getTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function getChartColors() {
  if (typeof document === 'undefined') {
    return {
      accent: '#3b82f6',
      accentFill: 'rgba(59, 130, 246, 0.15)',
      success: 'rgba(34, 197, 94, 0.6)',
      tick: '#8b949e',
      grid: 'rgba(255, 255, 255, 0.06)',
      gridX: 'rgba(255, 255, 255, 0.04)',
      purple: '#a78bfa',
    };
  }
  const root = getComputedStyle(document.documentElement);
  const v = (name, fallback) => root.getPropertyValue(name).trim() || fallback;
  return {
    accent: v('--app-accent', '#3b82f6'),
    accentFill: v('--chart-accent-fill', 'rgba(59, 130, 246, 0.15)'),
    success: v('--chart-success-fill', 'rgba(34, 197, 94, 0.6)'),
    tick: v('--chart-tick', '#8b949e'),
    grid: v('--chart-grid', 'rgba(255, 255, 255, 0.06)'),
    gridX: v('--chart-grid-x', 'rgba(255, 255, 255, 0.04)'),
    purple: v('--app-purple', '#a78bfa'),
  };
}
