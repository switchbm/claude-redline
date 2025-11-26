"""Theme definitions for the Redline review interface.

This module defines the available UI themes that can be selected via the --theme
command line argument. Each theme specifies a complete set of CSS custom properties
that control colors, backgrounds, borders, and other visual styles.

To add a new theme:
1. Create a new theme dictionary following the ThemeDefinition structure
2. Add it to the THEMES dictionary with a unique key
3. The theme will automatically be available via --theme <name>

Example:
    uvx redline --theme dark
    uvx redline --theme ocean
"""

from __future__ import annotations

from typing import TypedDict


class ThemeColors(TypedDict):
    """Color definitions for a theme."""

    # Background colors
    bg_page: str
    bg_card: str
    bg_card_hover: str
    bg_input: str
    bg_code: str
    bg_highlight: str
    bg_highlight_hover: str

    # Text colors
    text_primary: str
    text_secondary: str
    text_muted: str
    text_inverse: str

    # Accent colors
    accent_primary: str
    accent_primary_hover: str
    accent_secondary: str
    accent_success: str
    accent_error: str
    accent_warning: str

    # Border colors
    border_default: str
    border_light: str
    border_accent: str

    # Shadow
    shadow_sm: str
    shadow_md: str
    shadow_lg: str


class ThemeDefinition(TypedDict):
    """Complete theme definition."""

    name: str
    description: str
    colors: ThemeColors


# Clean theme - Professional blue/gray (formerly default)
CLEAN_THEME: ThemeDefinition = {
    "name": "clean",
    "description": "Clean professional theme with blue accents",
    "colors": {
        # Background colors
        "bg_page": "#f9fafb",
        "bg_card": "#ffffff",
        "bg_card_hover": "#f3f4f6",
        "bg_input": "#ffffff",
        "bg_code": "#f3f4f6",
        "bg_highlight": "#fef08a",
        "bg_highlight_hover": "#fde047",
        # Text colors
        "text_primary": "#111827",
        "text_secondary": "#4b5563",
        "text_muted": "#9ca3af",
        "text_inverse": "#ffffff",
        # Accent colors
        "accent_primary": "#2563eb",
        "accent_primary_hover": "#1d4ed8",
        "accent_secondary": "#6b7280",
        "accent_success": "#22c55e",
        "accent_error": "#ef4444",
        "accent_warning": "#f59e0b",
        # Border colors
        "border_default": "#e5e7eb",
        "border_light": "#f3f4f6",
        "border_accent": "#3b82f6",
        # Shadow
        "shadow_sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "shadow_md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        "shadow_lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    },
}

# Dark theme - Modern dark mode
DARK_THEME: ThemeDefinition = {
    "name": "dark",
    "description": "Modern dark theme for low-light environments",
    "colors": {
        # Background colors
        "bg_page": "#0f172a",
        "bg_card": "#1e293b",
        "bg_card_hover": "#334155",
        "bg_input": "#1e293b",
        "bg_code": "#0f172a",
        "bg_highlight": "#854d0e",
        "bg_highlight_hover": "#a16207",
        # Text colors
        "text_primary": "#f1f5f9",
        "text_secondary": "#cbd5e1",
        "text_muted": "#64748b",
        "text_inverse": "#0f172a",
        # Accent colors
        "accent_primary": "#3b82f6",
        "accent_primary_hover": "#60a5fa",
        "accent_secondary": "#94a3b8",
        "accent_success": "#4ade80",
        "accent_error": "#f87171",
        "accent_warning": "#fbbf24",
        # Border colors
        "border_default": "#334155",
        "border_light": "#1e293b",
        "border_accent": "#3b82f6",
        # Shadow
        "shadow_sm": "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        "shadow_md": "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
        "shadow_lg": "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
    },
}

# Forest theme - Nature-inspired greens
FOREST_THEME: ThemeDefinition = {
    "name": "forest",
    "description": "Nature-inspired theme with earthy green tones",
    "colors": {
        # Background colors
        "bg_page": "#f0fdf4",
        "bg_card": "#ffffff",
        "bg_card_hover": "#dcfce7",
        "bg_input": "#ffffff",
        "bg_code": "#f0fdf4",
        "bg_highlight": "#bbf7d0",
        "bg_highlight_hover": "#86efac",
        # Text colors
        "text_primary": "#14532d",
        "text_secondary": "#166534",
        "text_muted": "#4ade80",
        "text_inverse": "#ffffff",
        # Accent colors
        "accent_primary": "#16a34a",
        "accent_primary_hover": "#15803d",
        "accent_secondary": "#65a30d",
        "accent_success": "#22c55e",
        "accent_error": "#dc2626",
        "accent_warning": "#ca8a04",
        # Border colors
        "border_default": "#bbf7d0",
        "border_light": "#dcfce7",
        "border_accent": "#22c55e",
        # Shadow
        "shadow_sm": "0 1px 2px 0 rgba(20, 83, 45, 0.05)",
        "shadow_md": "0 4px 6px -1px rgba(20, 83, 45, 0.1)",
        "shadow_lg": "0 10px 15px -3px rgba(20, 83, 45, 0.1)",
    },
}

# Ocean theme - Cool blue/teal tones
OCEAN_THEME: ThemeDefinition = {
    "name": "ocean",
    "description": "Calm oceanic theme with blue and teal accents",
    "colors": {
        # Background colors
        "bg_page": "#ecfeff",
        "bg_card": "#ffffff",
        "bg_card_hover": "#cffafe",
        "bg_input": "#ffffff",
        "bg_code": "#ecfeff",
        "bg_highlight": "#a5f3fc",
        "bg_highlight_hover": "#67e8f9",
        # Text colors
        "text_primary": "#164e63",
        "text_secondary": "#0e7490",
        "text_muted": "#06b6d4",
        "text_inverse": "#ffffff",
        # Accent colors
        "accent_primary": "#0891b2",
        "accent_primary_hover": "#0e7490",
        "accent_secondary": "#0d9488",
        "accent_success": "#14b8a6",
        "accent_error": "#e11d48",
        "accent_warning": "#d97706",
        # Border colors
        "border_default": "#a5f3fc",
        "border_light": "#cffafe",
        "border_accent": "#06b6d4",
        # Shadow
        "shadow_sm": "0 1px 2px 0 rgba(22, 78, 99, 0.05)",
        "shadow_md": "0 4px 6px -1px rgba(22, 78, 99, 0.1)",
        "shadow_lg": "0 10px 15px -3px rgba(22, 78, 99, 0.1)",
    },
}

# Sunset theme - Warm orange/red tones
SUNSET_THEME: ThemeDefinition = {
    "name": "sunset",
    "description": "Warm sunset theme with orange and amber tones",
    "colors": {
        # Background colors
        "bg_page": "#fffbeb",
        "bg_card": "#ffffff",
        "bg_card_hover": "#fef3c7",
        "bg_input": "#ffffff",
        "bg_code": "#fffbeb",
        "bg_highlight": "#fde68a",
        "bg_highlight_hover": "#fcd34d",
        # Text colors
        "text_primary": "#78350f",
        "text_secondary": "#92400e",
        "text_muted": "#d97706",
        "text_inverse": "#ffffff",
        # Accent colors
        "accent_primary": "#ea580c",
        "accent_primary_hover": "#c2410c",
        "accent_secondary": "#dc2626",
        "accent_success": "#65a30d",
        "accent_error": "#dc2626",
        "accent_warning": "#f59e0b",
        # Border colors
        "border_default": "#fed7aa",
        "border_light": "#fef3c7",
        "border_accent": "#f97316",
        # Shadow
        "shadow_sm": "0 1px 2px 0 rgba(120, 53, 15, 0.05)",
        "shadow_md": "0 4px 6px -1px rgba(120, 53, 15, 0.1)",
        "shadow_lg": "0 10px 15px -3px rgba(120, 53, 15, 0.1)",
    },
}

# Minimal theme - Ultra-clean with subtle contrasts
MINIMAL_THEME: ThemeDefinition = {
    "name": "minimal",
    "description": "Ultra-clean minimal theme with subtle contrasts",
    "colors": {
        # Background colors
        "bg_page": "#fafafa",
        "bg_card": "#ffffff",
        "bg_card_hover": "#f5f5f5",
        "bg_input": "#ffffff",
        "bg_code": "#fafafa",
        "bg_highlight": "#e5e5e5",
        "bg_highlight_hover": "#d4d4d4",
        # Text colors
        "text_primary": "#171717",
        "text_secondary": "#525252",
        "text_muted": "#a3a3a3",
        "text_inverse": "#ffffff",
        # Accent colors
        "accent_primary": "#171717",
        "accent_primary_hover": "#404040",
        "accent_secondary": "#737373",
        "accent_success": "#22c55e",
        "accent_error": "#ef4444",
        "accent_warning": "#f59e0b",
        # Border colors
        "border_default": "#e5e5e5",
        "border_light": "#f5f5f5",
        "border_accent": "#171717",
        # Shadow
        "shadow_sm": "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        "shadow_md": "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        "shadow_lg": "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
    },
}

# Theme registry - add new themes here
THEMES: dict[str, ThemeDefinition] = {
    "dark": DARK_THEME,
    "clean": CLEAN_THEME,
    "forest": FOREST_THEME,
    "ocean": OCEAN_THEME,
    "sunset": SUNSET_THEME,
    "minimal": MINIMAL_THEME,
}

# Default theme name
DEFAULT_THEME_NAME = "dark"


def get_theme(name: str) -> ThemeDefinition:
    """Get a theme by name.

    Args:
        name: Theme name (case-insensitive)

    Returns:
        The theme definition

    Raises:
        ValueError: If theme name is not found
    """
    name_lower = name.lower()
    if name_lower not in THEMES:
        available = ", ".join(sorted(THEMES.keys()))
        raise ValueError(f"Unknown theme '{name}'. Available themes: {available}")
    return THEMES[name_lower]


def list_themes() -> list[str]:
    """Get list of available theme names.

    Returns:
        Sorted list of theme names
    """
    return sorted(THEMES.keys())


def get_theme_descriptions() -> dict[str, str]:
    """Get descriptions for all themes.

    Returns:
        Dict mapping theme name to description
    """
    return {name: theme["description"] for name, theme in THEMES.items()}
