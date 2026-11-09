/**
 * Theme colours needed outside CSS: the PWA manifest and the theme-color meta
 * tags can't read CSS variables. Keep these in sync with `--paper` in
 * app/globals.css (the single source of truth for the palette).
 */
export const themeColors = {
  light: "#f6efe3", // --paper (light)
  dark: "#1f1915", // --paper (dark, "kitchen at night")
} as const;
