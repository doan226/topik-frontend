import { useCallback, useEffect, useState } from 'react';
import { getTheme, setTheme as persistTheme, toggleTheme as flipTheme } from '../utils/theme';

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const sync = () => {
      setThemeState(document.documentElement.getAttribute('data-theme') || getTheme());
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback((next) => {
    persistTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = flipTheme();
    setThemeState(next);
    return next;
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
