// Vitest setup file
import { expect } from 'vitest';
import { vi } from 'vitest';

// Extend expect with custom matchers
expect.extend({
  toBeCloseToLuminance(received, expected, precision = 2) {
    const pass = Math.abs(received - expected) < Math.pow(10, -precision) / 2;
    return {
      pass,
      message: () =>
        `expected ${received} to be close to ${expected} (precision: ${precision})`,
      actual: received,
      expected,
    };
  }
});

// Mock matchMedia for CSS media queries
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Global CSS setup
document.body.innerHTML = `<div id="root"></div>`;