import { THEME_STORAGE_KEY } from './constants';
import { safeParse } from './auth';
import type { ThemeMode, ThemePreferences } from './types';

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'system',
  primaryColor: '#2563eb',
  compactMode: false,
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Derive light/dark from a CSS variable for .dark derivations */
function deriveDarkVariant(hex: string): { light: string; dark: string } {
  const safeHex = HEX_COLOR_RE.test(hex)
    ? hex
    : DEFAULT_PREFERENCES.primaryColor;

  // Simple heuristic: lighten by blending with white/black
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);

  const lighter = `#${Math.min(255, r + 80)
    .toString(16)
    .padStart(2, '0')}${Math.min(255, g + 80)
    .toString(16)
    .padStart(2, '0')}${Math.min(255, b + 80)
    .toString(16)
    .padStart(2, '0')}`;
  const darker = `#${Math.max(0, r - 30)
    .toString(16)
    .padStart(2, '0')}${Math.max(0, g - 30)
    .toString(16)
    .padStart(2, '0')}${Math.max(0, b - 30)
    .toString(16)
    .padStart(2, '0')}`;

  return { light: lighter, dark: darker };
}

/** Read persisted theme preferences from localStorage. */
export function getThemePreferences(): ThemePreferences {
  const stored = safeParse<Partial<ThemePreferences>>(
    localStorage.getItem(THEME_STORAGE_KEY),
  );
  return { ...DEFAULT_PREFERENCES, ...stored };
}

/** Persist theme preferences to localStorage. */
export function saveThemePreferences(prefs: ThemePreferences): void {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
}

/** Resolve effective mode (light or dark) from a ThemeMode value. */
export function resolveEffectiveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

/** Apply the given theme preferences to the document. */
export function applyTheme(prefs: ThemePreferences): void {
  const effective = resolveEffectiveMode(prefs.mode);
  const root = document.documentElement;

  // Toggle dark class
  root.classList.toggle('dark', effective === 'dark');

  // Apply primary color CSS variable
  root.style.setProperty('--tiger-primary', prefs.primaryColor);
  const { light, dark } = deriveDarkVariant(prefs.primaryColor);
  root.style.setProperty('--tiger-primary-light', light);
  root.style.setProperty('--tiger-primary-dark', dark);
}

/**
 * Watch system preference changes and auto-apply when mode is 'system'.
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(prefs: () => ThemePreferences): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const current = prefs();
    if (current.mode === 'system') {
      applyTheme(current);
    }
  };

  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
