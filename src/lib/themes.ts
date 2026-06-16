/* eslint-disable no-console */

/**
 * Custom Themes System
 * Based on LunaTV implementation
 *
 * Allows users to customize site appearance
 */

export interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  fonts: {
    body: string;
    heading: string;
    mono: string;
  };
  spacing: {
    unit: number;
    borderRadius: number;
  };
}

// Default themes
export const DEFAULT_THEMES: ThemeConfig[] = [
  {
    id: 'light',
    name: '浅色',
    colors: {
      primary: '#1976d2',
      secondary: '#9c27b0',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#212121',
      textSecondary: '#757575',
      border: '#e0e0e0',
      error: '#d32f2f',
      success: '#388e3c',
      warning: '#f57c00',
    },
    fonts: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'SFMono-Regular, Consolas, monospace',
    },
    spacing: {
      unit: 8,
      borderRadius: 8,
    },
  },
  {
    id: 'dark',
    name: '深色',
    colors: {
      primary: '#90caf9',
      secondary: '#ce93d8',
      background: '#121212',
      surface: '#1e1e1e',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#333333',
      error: '#ef5350',
      success: '#66bb6a',
      warning: '#ffa726',
    },
    fonts: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'SFMono-Regular, Consolas, monospace',
    },
    spacing: {
      unit: 8,
      borderRadius: 8,
    },
  },
  {
    id: 'midnight',
    name: '午夜蓝',
    colors: {
      primary: '#5c6bc0',
      secondary: '#7e57c2',
      background: '#0d1117',
      surface: '#161b22',
      text: '#c9d1d9',
      textSecondary: '#8b949e',
      border: '#30363d',
      error: '#f85149',
      success: '#3fb950',
      warning: '#d29922',
    },
    fonts: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'SFMono-Regular, Consolas, monospace',
    },
    spacing: {
      unit: 8,
      borderRadius: 8,
    },
  },
];

/**
 * Generate CSS variables from theme
 */
export function generateCSSVariables(theme: ThemeConfig): string {
  return `
:root {
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-background: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-text: ${theme.colors.text};
  --color-text-secondary: ${theme.colors.textSecondary};
  --color-border: ${theme.colors.border};
  --color-error: ${theme.colors.error};
  --color-success: ${theme.colors.success};
  --color-warning: ${theme.colors.warning};
  
  --font-body: ${theme.fonts.body};
  --font-heading: ${theme.fonts.heading};
  --font-mono: ${theme.fonts.mono};
  
  --spacing-unit: ${theme.spacing.unit}px;
  --border-radius: ${theme.spacing.borderRadius}px;
}
  `.trim();
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;

  const css = generateCSSVariables(theme);

  // Remove existing theme style
  const existing = document.getElementById('custom-theme');
  if (existing) {
    existing.remove();
  }

  // Add new theme style
  const style = document.createElement('style');
  style.id = 'custom-theme';
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Get theme from localStorage
 */
export function getStoredTheme(): ThemeConfig | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const stored = localStorage.getItem('custom-theme');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse stored theme:', e);
  }

  return null;
}

/**
 * Save theme to localStorage
 */
export function storeTheme(theme: ThemeConfig): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem('custom-theme', JSON.stringify(theme));
  } catch (e) {
    console.error('Failed to store theme:', e);
  }
}

/**
 * Create custom theme from partial config
 */
export function createCustomTheme(
  base: ThemeConfig,
  overrides: Partial<ThemeConfig>,
): ThemeConfig {
  return {
    ...base,
    ...overrides,
    colors: { ...base.colors, ...overrides.colors },
    fonts: { ...base.fonts, ...overrides.fonts },
    spacing: { ...base.spacing, ...overrides.spacing },
  };
}
