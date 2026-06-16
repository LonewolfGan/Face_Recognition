import React from 'react';
import { useTheme } from '../../theme';

/**
 * ContrastChecker Component
 * Automatically ensures text has proper contrast against background
 *
 * @param {Object} props
 * @param {string} props.backgroundColor - Background color (hex)
 * @param {string} props.preferredColor - Preferred text color (hex, optional)
 * @param {number} props.minRatio - Minimum contrast ratio (default 4.5 for WCAG AA)
 * @param {React.ReactNode} props.children - Content to render
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional styles
 */
const ContrastChecker = ({
  backgroundColor = 'transparent',
  preferredColor = null,
  minRatio = 4.5,
  children,
  className = '',
  style = {},
  ...props
}) => {
  const { getContrastingColor, meetsWCAGContrast } = useTheme();

  // If background is transparent, we can't determine contrast
  // Fall back to using theme-appropriate text color
  if (backgroundColor === 'transparent' || !backgroundColor) {
    return (
      <span className={`text-auto-contrast ${className}`} style={style} {...props}>
        {children}
      </span>
    );
  }

  // Get the contrasting color
  const textColor = getContrastingColor(backgroundColor, preferredColor, minRatio);

  // Check if preferred color meets standards
  const usesPreferredColor = preferredColor &&
    meetsWCAGContrast(backgroundColor, preferredColor, minRatio >= 7 ? 'AAA' : 'AA');

  return (
    <span
      className={className}
      style={{
        color: textColor,
        ...style
      }}
      data-contrast-checked="true"
      data-uses-preferred={usesPreferredColor || undefined}
      {...props}
    >
      {children}
    </span>
  );
};

/**
 * BackgroundContrastChecker
 * Checks contrast against a specific background element
 *
 * @param {Object} props
 * @param {string} props.bgSelector - CSS selector for background element
 * @param {string} props.preferredColor - Preferred text color (hex, optional)
 * @param {number} props.minRatio - Minimum contrast ratio
 * @param {React.ReactNode} props.children - Content to render
 * @param {string} props.className - Additional CSS classes
 */
const BackgroundContrastChecker = ({
  bgSelector,
  preferredColor = null,
  minRatio = 4.5,
  children,
  className = '',
  ...props
}) => {
  const { getContrastingColor } = useTheme();
  const [bgColor, setBgColor] = React.useState(null);

  React.useEffect(() => {
    if (!bgSelector) return;

    try {
      const bgElement = document.querySelector(bgSelector);
      if (bgElement) {
        const computedStyle = window.getComputedStyle(bgElement);
        const bgColor = computedStyle.backgroundColor;

        // Convert RGB/RGBA to hex for our contrast functions
        if (bgColor.startsWith('rgb')) {
          const match = bgColor.match(/\d+/g);
          if (match && match.length >= 3) {
            const r = parseInt(match[0]);
            const g = parseInt(match[1]);
            const b = parseInt(match[2]);
            const hex = `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
            setBgColor(hex);
          }
        }
      }
    } catch (error) {
      console.warn('Could not determine background color:', error);
    }
  }, [bgSelector]);

  if (!bgColor) {
    return (
      <span className={`text-auto-contrast ${className}`} {...props}>
        {children}
      </span>
    );
  }

  const textColor = getContrastingColor(bgColor, preferredColor, minRatio);

  return (
    <span
      className={className}
      style={{ color: textColor, ...props.style }}
      {...props}
    >
      {children}
    </span>
  );
};

export { ContrastChecker, BackgroundContrastChecker };

export default ContrastChecker;