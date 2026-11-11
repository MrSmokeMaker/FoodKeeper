/**
 * Theme utility service.
 * Handles initial theme detection (Telegram, system preference, localStorage)
 * and applying the theme to the document root.
 */

export type Theme = 'light' | 'dark';

/**
 * Determine the initial theme.
 * Priority:
 *   1. localStorage "theme"
 *   2. Telegram WebApp colorScheme if available
 *   3. System prefers-color-scheme media query
 */
export function getInitialTheme(tgColorScheme?: 'light' | 'dark'): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored as Theme;
  }
  if (tgColorScheme) {
    return tgColorScheme as Theme;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Apply the given theme to the document and persist it.
 */
export function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
}
