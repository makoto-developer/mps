import { test, expect } from '@playwright/test';

test.describe('Canvas Drawing - Scroll Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if already logged in
    const isLoggedIn = await page.locator('text=Logged in as').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Register a user
      await page.fill('input[type="email"]', `testuser${Date.now()}@example.com`);
      await page.fill('input[id="nickname"]', 'Test User');
      await page.click('button:has-text("Create User")');
      
      // Wait for login to complete
      await page.waitForSelector('text=Logged in as', { timeout: 10000 });
    }
    
    // Create a room
    await page.fill('input[id="title"]', `Test Room ${Date.now()}`);
    await page.fill('input[id="theme"]', 'Test Theme');
    await page.click('button:has-text("Create Room")');
    
    // Wait for room creation success message
    await page.waitForTimeout(2000);
    
    // Click on the room to open it - use a more specific selector
    const roomCards = page.locator('.cursor-pointer').filter({ hasText: 'Test Room' });
    await roomCards.first().click();
    
    // Wait for canvas to appear
    await page.waitForSelector('canvas', { timeout: 10000 });
  });

  test('should not scroll page when drawing on canvas', async ({ page }) => {
    // Get canvas element
    const canvas = await page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Scroll canvas into view first
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Get initial scroll position AFTER scrolling canvas into view
    const initialScrollY = await page.evaluate(() => window.scrollY);
    console.log('Initial scroll Y:', initialScrollY);
    
    // Get canvas bounding box
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas not found');
    }
    
    console.log('Canvas box:', box);
    
    // Draw on canvas (simulate dragging) - use viewport coordinates
    const startX = box.x + 100;
    const startY = box.y + 100;
    const endX = box.x + 300;
    const endY = box.y + 300;
    
    console.log('Drawing from', { x: startX, y: startY }, 'to', { x: endX, y: endY });
    
    // Mouse down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Draw a line by moving mouse
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(10);
    }
    
    // Mouse up
    await page.mouse.up();
    
    // Wait a bit
    await page.waitForTimeout(500);
    
    // Get final scroll position
    const finalScrollY = await page.evaluate(() => window.scrollY);
    
    console.log('Final scroll Y:', finalScrollY);
    console.log('Scroll delta:', finalScrollY - initialScrollY);
    
    // Check that scroll position hasn't changed significantly
    expect(Math.abs(finalScrollY - initialScrollY)).toBeLessThan(50);
  });

  test('should allow normal page scrolling outside canvas', async ({ page }) => {
    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Scroll down using mouse wheel on a non-canvas area
    await page.mouse.wheel(0, 500);

    // Wait a bit
    await page.waitForTimeout(300);

    // Get final scroll position
    const finalScrollY = await page.evaluate(() => window.scrollY);

    // Should have scrolled
    expect(finalScrollY).toBeGreaterThan(initialScrollY);
  });

  test('should not scroll when clicking Clear Canvas button', async ({ page }) => {
    // Find Clear Canvas button first and scroll it into view
    const clearButton = page.locator('button:has-text("Clear Canvas")');
    await expect(clearButton).toBeVisible();

    // Scroll button into view
    await clearButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get initial scroll position AFTER scrolling button into view
    const initialScrollY = await page.evaluate(() => window.scrollY);
    console.log('Initial scroll Y before Clear Canvas:', initialScrollY);

    // Handle the confirm dialog
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.dismiss(); // Dismiss the confirm dialog
    });

    // Click the Clear Canvas button
    await clearButton.click();

    // Wait a bit
    await page.waitForTimeout(500);

    // Get final scroll position
    const finalScrollY = await page.evaluate(() => window.scrollY);
    console.log('Final scroll Y after Clear Canvas:', finalScrollY);
    console.log('Scroll delta:', finalScrollY - initialScrollY);

    // Check that scroll position hasn't changed significantly
    expect(Math.abs(finalScrollY - initialScrollY)).toBeLessThan(50);
  });
});
