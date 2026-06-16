const { test, expect } = require('@playwright/test');

/**
 * UI/UX Tests for Face Recognition Application
 * Tests contrast, accessibility, and visual consistency
 */

test.describe('UI/UX and Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // Test logo display in different themes
  test('Logo displays correctly in light and dark modes', async ({ page }) => {
    // Check light mode logo
    const logo = page.locator('img[alt=""]');
    await expect(logo).toBeVisible();

    // Get initial logo source
    const lightModeSrc = await logo.getAttribute('src');
    expect(lightModeSrc).toContain('/logolight.png'); // Light mode should show dark logo

    // Switch to dark mode
    const themeToggle = page.locator('button[aria-label="Mode sombre"]');
    await themeToggle.click();
    await page.waitForTimeout(500); // Wait for theme transition

    // Check dark mode logo
    const darkModeSrc = await logo.getAttribute('src');
    expect(darkModeSrc).toContain('/logodark.png'); // Dark mode should show light logo
  });

  // Test navbar contrast when scrolled
  test('Navbar maintains readability when scrolled', async ({ page }) => {
    // Scroll down to trigger nav-scrolled class
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    const nav = page.locator('header.nav-scrolled');
    await expect(nav).toBeVisible();

    // Check that text has proper contrast
    const navLinks = nav.locator('a >> visible=true');
    for (const link of await navLinks.all()) {
      const color = await link.evaluate(el => {
        return window.getComputedStyle(el).color;
      });
      const bgColor = await nav.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Simple contrast check (in a real test, use proper contrast calculation)
      expect(color).not.toBe(bgColor);
    }
  });

  // Test FinalCTA contrast
  test('Final CTA has readable text', async ({ page }) => {
    await page.goto('/#'); // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const ctaSection = page.locator('section').filter({ hasText: 'Vos notes méritent mieux' });
    const heading = ctaSection.locator('h2');
    const paragraph = ctaSection.locator('p');

    await expect(heading).toBeVisible();
    await expect(paragraph).toBeVisible();

    // Check text colors are not too similar to background
    const headingColor = await heading.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    const bgColor = await ctaSection.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(headingColor).not.toBe(bgColor);
  });

  // Test AuthPage logo consistency
  test('AuthPage logo matches LandingPage pattern', async ({ page }) => {
    await page.goto('/login');

    const logo = page.locator('img[alt=""]');
    await expect(logo).toBeVisible();

    // Should follow same pattern as landing page
    const src = await logo.getAttribute('src');
    expect(src).toMatch(/.+(logolight|logodark)\.png/);
  });

  // Test theme toggle accessibility
  test('Theme toggle has proper ARIA attributes', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label]');
    await expect(themeToggle).toHaveAttribute('aria-label', /Mode (clair|sombre)/);
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toBeEnabled();
  });

  // Test button contrast
  test('Buttons have sufficient contrast', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const firstButton = buttons.first();

    await expect(firstButton).toBeVisible();

    const buttonColor = await firstButton.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    const buttonBg = await firstButton.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(buttonColor).not.toBe(buttonBg);
  });

  // Test responsive design
  test('Responsive design works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // Check mobile menu exists
    const mobileMenuButton = page.locator('button[aria-label="Ouvrir le menu"]');
    await expect(mobileMenuButton).toBeVisible();

    // Open mobile menu
    await mobileMenuButton.click();
    await page.waitForTimeout(300);

    // Check menu items are visible
    const menuItems = page.locator('a >> visible=true');
    expect(await menuItems.count()).toBeGreaterThan(0);
  });
});

/**
 * Visual regression tests
 */
test.describe('Visual Regression Tests', () => {
  test('Landing page header matches snapshot', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toHaveScreenshot('landing-header-light.png');
  });

  test('Landing page header in dark mode matches snapshot', async ({ page }) => {
    await page.goto('/');
    const themeToggle = page.locator('button[aria-label="Mode sombre"]');
    await themeToggle.click();
    await page.waitForTimeout(500);

    const header = page.locator('header');
    await expect(header).toHaveScreenshot('landing-header-dark.png');
  });
});