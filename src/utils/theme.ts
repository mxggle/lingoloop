/**
 * Converts a hex color string to an RGB string (r g b).
 * Useful for Tailwind CSS variables.
 */
export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Converts a hex color string and an alpha value to an RGBA string.
 * Useful for Canvas and direct style applications.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Applies theme colors to the document root as CSS variables.
 */
export function applyTheme(colors: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    // Set the base color in RGB format for Tailwind opacity support
    root.style.setProperty(`--theme-${key}-rgb`, hexToRgb(value));
    // Set the hex value for direct use if needed
    root.style.setProperty(`--theme-${key}`, value);
  });
}
