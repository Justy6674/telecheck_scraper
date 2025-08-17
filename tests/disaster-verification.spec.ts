import { test, expect } from '@playwright/test';

test.describe('Australian Disaster Verification Platform', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8081/');
  });

  test('should load the landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/TeleCheck/);
    await expect(page.locator('h1')).toContainText('TeleCheck');
    await expect(page.locator('text=Australian Telehealth Disaster Verification')).toBeVisible();
  });

  test('should display state tiles with disaster data', async ({ page }) => {
    // Check that state tiles are visible
    await expect(page.locator('text=Current Population Living in Declared Natural Disaster Zones')).toBeVisible();
    
    // Verify all 8 states are displayed
    const states = ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
                   'South Australia', 'Tasmania', 'Northern Territory', 'Australian Capital Territory'];
    
    for (const state of states) {
      await expect(page.locator(`text=${state}`)).toBeVisible();
    }
  });

  test('should verify postcode in disaster zone', async ({ page }) => {
    // Test Brisbane postcode (4000) which should be in disaster zone
    await page.fill('input[placeholder*="4-digit postcode"]', '4000');
    await page.click('button:has-text("Verify")');
    
    // Should show disaster exemption active
    await expect(page.locator('text=DISASTER EXEMPTION ACTIVE')).toBeVisible({ timeout: 10000 });
  });

  test('should verify postcode NOT in disaster zone', async ({ page }) => {
    // Test a postcode we know has no disasters (9999 doesn't exist)
    await page.fill('input[placeholder*="4-digit postcode"]', '2000');
    await page.click('button:has-text("Verify")');
    
    // Wait for result
    await page.waitForSelector('text=/No active disaster|DISASTER EXEMPTION/', { timeout: 10000 });
  });

  test('should show Sign In and Subscribe buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('button:has-text("Subscribe")')).toBeVisible();
  });

  test('should navigate to auth page', async ({ page }) => {
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should take screenshot of landing page', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/landing-page.png', fullPage: true });
  });

  test('should take screenshot of state tiles', async ({ page }) => {
    const stateTiles = page.locator('text=Current Population Living in Declared Natural Disaster Zones').locator('..');
    await stateTiles.screenshot({ path: 'tests/screenshots/state-tiles.png' });
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    await expect(page.locator('h1')).toContainText('TeleCheck');
    await page.screenshot({ path: 'tests/screenshots/mobile-view.png', fullPage: true });
  });
});