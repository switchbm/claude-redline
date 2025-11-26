/**
 * Apply a theme to the document by setting CSS custom properties.
 *
 * This function takes a ThemeDefinition and applies all its colors
 * as CSS custom properties on the document root element. The CSS
 * then uses these variables for styling.
 */

import type { ThemeDefinition, ThemeColors } from './types'

/**
 * Convert theme color keys from snake_case to kebab-case for CSS variables.
 */
function toKebabCase(str: string): string {
  return str.replace(/_/g, '-')
}

/**
 * Apply a theme's colors as CSS custom properties.
 *
 * @param theme - The theme definition to apply
 *
 * @example
 * ```ts
 * const config = await fetchConfig()
 * applyTheme(config.theme)
 * ```
 */
export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement

  // Apply each color as a CSS custom property
  const colors = theme.colors
  for (const [key, value] of Object.entries(colors)) {
    const cssVarName = `--${toKebabCase(key)}`
    root.style.setProperty(cssVarName, value)
  }

  // Also set the theme name as a data attribute for potential CSS selectors
  root.setAttribute('data-theme', theme.name)
}

/**
 * Get the default theme colors for fallback/initial render.
 *
 * These match the "dark" theme from the backend (the default).
 */
export const defaultThemeColors: ThemeColors = {
  // Background colors
  bg_page: '#0f172a',
  bg_card: '#1e293b',
  bg_card_hover: '#334155',
  bg_input: '#1e293b',
  bg_code: '#0f172a',
  bg_highlight: '#854d0e',
  bg_highlight_hover: '#a16207',
  // Text colors
  text_primary: '#f1f5f9',
  text_secondary: '#cbd5e1',
  text_muted: '#64748b',
  text_inverse: '#0f172a',
  // Accent colors
  accent_primary: '#3b82f6',
  accent_primary_hover: '#60a5fa',
  accent_secondary: '#94a3b8',
  accent_success: '#4ade80',
  accent_error: '#f87171',
  accent_warning: '#fbbf24',
  // Border colors
  border_default: '#334155',
  border_light: '#1e293b',
  border_accent: '#3b82f6',
  // Shadow
  shadow_sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  shadow_md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
  shadow_lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
}

/**
 * Apply default theme colors as CSS variables.
 *
 * Call this on initial page load to ensure CSS variables are set
 * before the config is fetched from the server.
 */
export function applyDefaultTheme(): void {
  const root = document.documentElement

  for (const [key, value] of Object.entries(defaultThemeColors)) {
    const cssVarName = `--${toKebabCase(key)}`
    root.style.setProperty(cssVarName, value)
  }

  root.setAttribute('data-theme', 'dark')
}
