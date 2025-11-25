/**
 * Theme type definitions for the Redline review interface.
 *
 * These types mirror the backend theme definitions in Python.
 * Themes are fetched from the /api/config endpoint and applied
 * as CSS custom properties.
 */

export interface ThemeColors {
  // Background colors
  bg_page: string
  bg_card: string
  bg_card_hover: string
  bg_input: string
  bg_code: string
  bg_highlight: string
  bg_highlight_hover: string

  // Text colors
  text_primary: string
  text_secondary: string
  text_muted: string
  text_inverse: string

  // Accent colors
  accent_primary: string
  accent_primary_hover: string
  accent_secondary: string
  accent_success: string
  accent_error: string
  accent_warning: string

  // Border colors
  border_default: string
  border_light: string
  border_accent: string

  // Shadow
  shadow_sm: string
  shadow_md: string
  shadow_lg: string
}

export interface ThemeDefinition {
  name: string
  description: string
  colors: ThemeColors
}

export interface ConfigResponse {
  theme: ThemeDefinition
  available_themes: string[]
}
