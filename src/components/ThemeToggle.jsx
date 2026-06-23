import React from 'react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle${className ? ` ${className}` : ''}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
    >
      <span className="theme-toggle-icon" aria-hidden>
        {isDark ? '☀️' : '🌙'}
      </span>
      <span className="theme-toggle-label">{isDark ? 'Sáng' : 'Tối'}</span>
    </button>
  );
}
