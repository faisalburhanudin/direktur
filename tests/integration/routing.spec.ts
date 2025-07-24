import { test, expect } from 'patchright/test';

test.describe('URL Routing Integration Tests', () => {
  test('homepage loads at root URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that homepage content is visible
    await expect(page.getByText('What would you like to automate?')).toBeVisible();
    await expect(page.getByText('Starter prompts')).toBeVisible();
    
    // Verify URL is correct
    expect(page.url()).toMatch(/\/$|\/$/);
  });

  test('direct navigation to /browser URL works', async ({ page }) => {
    await page.goto('/browser');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the browser page
    expect(page.url()).toContain('/browser');
    
    // Homepage content should not be visible
    await expect(page.getByText('What would you like to automate?')).not.toBeVisible();
  });

  test('browser back button works after navigation', async ({ page }) => {
    // Start on homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to browser view directly via URL
    await page.goto('/browser');
    await page.waitForLoadState('networkidle');
    
    // Use browser back button
    await page.goBack();
    await page.waitForURL('/');
    
    // Verify we're back on homepage
    expect(page.url()).toMatch(/\/$|\/$/);
    await expect(page.getByText('What would you like to automate?')).toBeVisible();
  });

  test('browser forward button works after back navigation', async ({ page }) => {
    // Start on homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to browser view
    await page.goto('/browser');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    await page.waitForURL('/');
    
    // Go forward again
    await page.goForward();
    await page.waitForURL('/browser');
    
    // Verify we're back on browser page
    expect(page.url()).toContain('/browser');
    await expect(page.getByText('What would you like to automate?')).not.toBeVisible();
  });

  test('URLs are shareable - direct access to specific views', async ({ page }) => {
    // Test direct access to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('What would you like to automate?')).toBeVisible();
    
    // Test direct access to browser view
    await page.goto('/browser');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/browser');
    await expect(page.getByText('What would you like to automate?')).not.toBeVisible();
  });

  test('page refresh preserves current view', async ({ page }) => {
    // Navigate to browser view
    await page.goto('/browser');
    await page.waitForLoadState('domcontentloaded');
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're still on browser view after refresh
    expect(page.url()).toContain('/browser');
    await expect(page.getByText('What would you like to automate?')).not.toBeVisible();
  });
});