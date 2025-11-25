/**
 * Theme system exports for the Redline review interface.
 *
 * Usage:
 * ```ts
 * import { applyTheme, applyDefaultTheme, type ThemeDefinition } from './themes'
 *
 * // Apply default theme immediately
 * applyDefaultTheme()
 *
 * // Then fetch and apply the configured theme
 * const config = await fetch('/api/config').then(r => r.json())
 * applyTheme(config.theme)
 * ```
 */

export type { ThemeColors, ThemeDefinition, ConfigResponse } from './types'
export { applyTheme, applyDefaultTheme, defaultThemeColors } from './applyTheme'
