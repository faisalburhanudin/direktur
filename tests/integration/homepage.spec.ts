import { test, expect } from 'patchright/test';

test.describe('Homepage Integration Tests', () => {
  test('homepage renders correctly with main heading', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check main heading
    await expect(page.getByText('What would you like to automate?')).toBeVisible();
  });
});