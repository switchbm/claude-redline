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
 * These match the "default" theme from the backend.
 */
export const defaultThemeColors: ThemeColors = {
  // Background colors
  bg_page: '#f9fafb',
  bg_card: '#ffffff',
  bg_card_hover: '#f3f4f6',
  bg_input: '#ffffff',
  bg_code: '#f3f4f6',
  bg_highlight: '#fef08a',
  bg_highlight_hover: '#fde047',
  // Text colors
  text_primary: '#111827',
  text_secondary: '#4b5563',
  text_muted: '#9ca3af',
  text_inverse: '#ffffff',
  // Accent colors
  accent_primary: '#2563eb',
  accent_primary_hover: '#1d4ed8',
  accent_secondary: '#6b7280',
  accent_success: '#22c55e',
  accent_error: '#ef4444',
  accent_warning: '#f59e0b',
  // Border colors
  border_default: '#e5e7eb',
  border_light: '#f3f4f6',
  border_accent: '#3b82f6',
  // Shadow
  shadow_sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadow_md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  shadow_lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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

  root.setAttribute('data-theme', 'default')
}
