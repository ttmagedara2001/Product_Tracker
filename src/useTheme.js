/**
 * useTheme.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook that manages the application's light / dark theme.
 *
 * Behaviour:
 *  1. On first visit, reads VITE_DEFAULT_THEME from .env (via import.meta.env).
 *  2. On subsequent visits, restores the user's last choice from localStorage.
 *  3. Syncs the `dark` class on <html> so Tailwind's darkMode:"class" strategy
 *     works across every component without prop-drilling.
 *  4. Exposes { isDark, toggleTheme, setTheme } for flexible usage.
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'stitch-hive-theme';

// Read the default theme set in .env (falls back to "light" if unset)
const ENV_DEFAULT_THEME = import.meta.env.VITE_DEFAULT_THEME ?? 'light';

// ─── Helper: resolve the initial theme ────────────────────────────────────────
function resolveInitialTheme() {
  // 1. Prefer the user's saved preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }

  // 2. Fall back to the .env variable
  if (ENV_DEFAULT_THEME === 'dark') {
    return 'dark';
  }

  // 3. Hardcoded default: light
  return 'light';
}

// ─── Helper: apply theme class to <html> ─────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const initial = resolveInitialTheme();
    // Apply immediately so there's no flash of wrong theme
    applyTheme(initial);
    return initial;
  });

  // Keep <html> class and localStorage in sync whenever theme changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  /** Set a specific theme: 'light' | 'dark' */
  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') {
      console.warn(`[useTheme] Unknown theme "${newTheme}". Use "light" or "dark".`);
      return;
    }
    setThemeState(newTheme);
  }, []);

  /** Toggle between light and dark */
  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return {
    theme,          // 'light' | 'dark'
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,    // () => void
    setTheme,       // (theme: 'light' | 'dark') => void
  };
}
