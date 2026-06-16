import {
  getLuminance,
  calculateContrastRatio,
  getContrastingColor,
  meetsWCAGContrast,
  hexToRGB,
  adjustColor
} from './themeUtils';

describe('Theme Utilities', () => {
  describe('getLuminance', () => {
    test('returns correct luminance for white', () => {
      expect(getLuminance('#FFFFFF')).toBeCloseTo(1, 2);
    });

    test('returns correct luminance for black', () => {
      expect(getLuminance('#000000')).toBeCloseTo(0, 2);
    });

    test('returns correct luminance for medium gray', () => {
      const luminance = getLuminance('#808080');
      expect(luminance).toBeGreaterThan(0.1);
      expect(luminance).toBeLessThan(0.3);
    });

    test('handles short hex colors', () => {
      expect(getLuminance('#FFF')).toBeCloseTo(getLuminance('#FFFFFF'), 2);
      expect(getLuminance('#000')).toBeCloseTo(getLuminance('#000000'), 2);
    });
  });

  describe('calculateContrastRatio', () => {
    test('returns 21 for black on white (maximum contrast)', () => {
      expect(calculateContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    });

    test('returns 1 for same colors (minimum contrast)', () => {
      expect(calculateContrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
      expect(calculateContrastRatio('#000000', '#000000')).toBe(1);
    });

    test('returns correct ratio for medium contrast', () => {
      const ratio = calculateContrastRatio('#7A35F2', '#FFFFFF');
      expect(ratio).toBeGreaterThan(4.5); // Should meet WCAG AA
    });
  });

  describe('getContrastingColor', () => {
    test('returns white for dark backgrounds', () => {
      expect(getContrastingColor('#000000')).toBe('#f0eeff');
      expect(getContrastingColor('#0a0a0a')).toBe('#f0eeff');
    });

    test('returns dark color for light backgrounds', () => {
      expect(getContrastingColor('#FFFFFF')).toBe('#0a0a0a');
      expect(getContrastingColor('#f7f7f5')).toBe('#0a0a0a');
    });

    test('uses preferred color when it has enough contrast', () => {
      // White on dark purple should have good contrast
      expect(getContrastingColor('#7A35F2', '#FFFFFF', 4.5)).toBe('#FFFFFF');
    });

    test('falls back to default when preferred color lacks contrast', () => {
      // Light gray on white has poor contrast
      expect(getContrastingColor('#FFFFFF', '#CCCCCC', 4.5)).toBe('#0a0a0a');
    });

    test('respects different contrast requirements', () => {
      // White on purple passes AA (4.5:1) but not AAA (7:1)
      // Purple on white has ratio ~5.8, which passes AA but not AAA
      const purpleOnWhiteRatio = calculateContrastRatio('#7A35F2', '#FFFFFF');
      console.log('Purple on white ratio:', purpleOnWhiteRatio);

      // Since purple on white doesn't meet AAA, it should fall back to default
      const aaColor = getContrastingColor('#7A35F2', '#FFFFFF', 4.5);
      const aaaColor = getContrastingColor('#7A35F2', '#FFFFFF', 7);

      expect(aaColor).toBe('#FFFFFF'); // White passes AA on purple
      expect(aaaColor).toBe('#f0eeff'); // Falls back to default for AAA
    });
  });

  describe('meetsWCAGContrast', () => {
    test('identifies AA compliant contrasts', () => {
      expect(meetsWCAGContrast('#000000', '#FFFFFF', 'AA')).toBe(true);
      expect(meetsWCAGContrast('#7A35F2', '#FFFFFF', 'AA')).toBe(true);
    });

    test('identifies non-AA compliant contrasts', () => {
      expect(meetsWCAGContrast('#FFFFFF', '#F0F0F0', 'AA')).toBe(false);
      expect(meetsWCAGContrast('#7A35F2', '#7B35F3', 'AA')).toBe(false);
    });

    test('identifies AAA compliant contrasts', () => {
      expect(meetsWCAGContrast('#000000', '#FFFFFF', 'AAA')).toBe(true);
      // Purple on white has ratio ~5.8, which passes AA but not AAA
      const ratio = calculateContrastRatio('#7A35F2', '#FFFFFF');
      console.log('Purple on white contrast ratio:', ratio);
      expect(ratio).toBeGreaterThanOrEqual(4.5); // Passes AA
      expect(ratio).toBeLessThan(7); // Doesn't pass AAA
      expect(meetsWCAGContrast('#7A35F2', '#FFFFFF', 'AAA')).toBe(false);
    });

    test('correctly identifies non-AAA compliant contrasts', () => {
      // Some combinations pass AA but not AAA
      expect(meetsWCAGContrast('#666666', '#999999', 'AAA')).toBe(false);
    });
  });

  describe('hexToRGB', () => {
    test('converts hex to RGB', () => {
      expect(hexToRGB('#FFFFFF')).toBe('rgb(255, 255, 255)');
      expect(hexToRGB('#000000')).toBe('rgb(0, 0, 0)');
      expect(hexToRGB('#7A35F2')).toBe('rgb(122, 53, 242)'); // 7A = 122, 35 = 53, F2 = 242
    });

    test('converts hex to RGBA with alpha', () => {
      expect(hexToRGB('#FFFFFF', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
      expect(hexToRGB('#000000', 0.8)).toBe('rgba(0, 0, 0, 0.8)');
    });

    test('handles short hex colors', () => {
      expect(hexToRGB('#FFF')).toBe('rgb(255, 255, 255)');
      expect(hexToRGB('#000')).toBe('rgb(0, 0, 0)');
    });
  });

  describe('adjustColor', () => {
    test('darkens colors', () => {
      const darker = adjustColor('#7A35F2', -20);
      expect(darker).not.toBe('#7A35F2');
      // Should be darker (lower hex values)
      const originalLum = getLuminance('#7A35F2');
      const darkerLum = getLuminance(darker);
      expect(darkerLum).toBeLessThan(originalLum);
    });

    test('lightens colors', () => {
      const lighter = adjustColor('#7A35F2', 20);
      expect(lighter).not.toBe('#7A35F2');
      // Should be lighter (higher hex values)
      const originalLum = getLuminance('#7A35F2');
      const lighterLum = getLuminance(lighter);
      expect(lighterLum).toBeGreaterThan(originalLum);
    });

    test('handles edge cases', () => {
      // Darkening black should still be black
      expect(adjustColor('#000000', -10)).toBe('#000000');
      // Lightening white should still be white (case may vary)
      const lightenedWhite = adjustColor('#FFFFFF', 10);
      expect(lightenedWhite.toUpperCase()).toBe('#FFFFFF');
    });
  });
});