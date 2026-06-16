/**
 * Theme Utilities - Contrast and Color Management
 * Ensures WCAG compliance and proper contrast ratios
 */

/**
 * Calculate luminance of a color (for contrast ratio calculations)
 * @param {string} hexColor - Hex color code
 * @returns {number} Luminance value (0-1)
 */
export function getLuminance(hexColor) {
  // Remove # if present
  const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;

  // Convert short hex to full hex
  const fullColor = color.length === 3
    ? color.split('').map(c => c + c).join('')
    : color;

  // Convert to RGB
  const r = parseInt(fullColor.substring(0, 2), 16) / 255;
  const g = parseInt(fullColor.substring(2, 4), 16) / 255;
  const b = parseInt(fullColor.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const gammaCorrect = (c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLin = gammaCorrect(r);
  const gLin = gammaCorrect(g);
  const bLin = gammaCorrect(b);

  // Calculate relative luminance
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get contrasting color for accessibility
 * @param {string} backgroundColor - Background hex color
 * @param {string} preferredColor - Preferred text color (optional)
 * @param {number} minRatio - Minimum contrast ratio (default 4.5 for WCAG AA)
 * @returns {string} Contrasting color (hex)
 */
export function getContrastingColor(backgroundColor, preferredColor = null, minRatio = 4.5) {
  const bgLum = getLuminance(backgroundColor);

  // Default to black or white based on background luminance
  const defaultDark = '#0a0a0a'; // Almost black
  const defaultLight = '#f0eeff'; // Light purple-ish white

  const defaultContrastColor = bgLum > 0.5 ? defaultDark : defaultLight;

  // If no preferred color, return default
  if (!preferredColor) {
    return defaultContrastColor;
  }

  // Check if preferred color has enough contrast
  const contrastRatio = calculateContrastRatio(backgroundColor, preferredColor);

  if (contrastRatio >= minRatio) {
    return preferredColor;
  }

  // Fall back to default contrasting color
  return defaultContrastColor;
}

/**
 * Check if a color combination meets WCAG standards
 * @param {string} backgroundColor - Background hex color
 * @param {string} textColor - Text hex color
 * @param {string} level - 'AA' (4.5:1) or 'AAA' (7:1)
 * @returns {boolean} Whether combination meets standards
 */
export function meetsWCAGContrast(backgroundColor, textColor, level = 'AA') {
  const minRatio = level === 'AAA' ? 7 : 4.5;
  const ratio = calculateContrastRatio(backgroundColor, textColor);
  return ratio >= minRatio;
}

/**
 * Convert hex color to RGB string for CSS
 * @param {string} hexColor - Hex color code
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGB/RGBA string
 */
export function hexToRGB(hexColor, alpha = 1) {
  const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  const fullColor = color.length === 3
    ? color.split('').map(c => c + c).join('')
    : color;

  const r = parseInt(fullColor.substring(0, 2), 16);
  const g = parseInt(fullColor.substring(2, 4), 16);
  const b = parseInt(fullColor.substring(4, 6), 16);

  return alpha < 1
    ? `rgba(${r}, ${g}, ${b}, ${alpha})`
    : `rgb(${r}, ${g}, ${b})`;
}

/**
 * Darken or lighten a color
 * @param {string} hexColor - Hex color code
 * @param {number} percent - Percentage to darken (-) or lighten (+)
 * @returns {string} Adjusted hex color
 */
export function adjustColor(hexColor, percent) {
  const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  const fullColor = color.length === 3
    ? color.split('').map(c => c + c).join('')
    : color;

  // Convert to RGB
  let r = parseInt(fullColor.substring(0, 2), 16);
  let g = parseInt(fullColor.substring(2, 4), 16);
  let b = parseInt(fullColor.substring(4, 6), 16);

  // Apply percentage change
  r = Math.min(255, Math.max(0, Math.round(r * (1 + percent / 100))));
  g = Math.min(255, Math.max(0, Math.round(g * (1 + percent / 100))));
  b = Math.min(255, Math.max(0, Math.round(b * (1 + percent / 100))));

  // Convert back to hex
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}