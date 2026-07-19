/** Light/dark theme, shared by the generator and the editor. The theme is a
 * `data-theme` attribute on <html>; both views read the same stored preference,
 * and it inherits into the editor's shadow DOM via CSS custom properties. */
export const THEME_KEY = 'cupons_theme';

/** Browser-chrome color (<meta name="theme-color"> in the shells). Values
 *  mirror --paper in each theme — keep in sync with app.css. */
const THEME_COLOR = { light: '#f4efe6', dark: '#17160e' } as const;
function syncMetaThemeColor(theme: 'light' | 'dark'): void {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

/** Apply the stored preference on load (default light — no attribute). */
export function applyStoredTheme(): void {
  try {
    if (localStorage.getItem(THEME_KEY) === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      syncMetaThemeColor('dark');
    }
  } catch {
    /* ignore */
  }
}

/** Flip the theme, persist it, and return the new value. */
export function toggleTheme(): 'light' | 'dark' {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  syncMetaThemeColor(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export function isDark(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
