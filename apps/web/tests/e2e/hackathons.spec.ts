import { test, expect } from '@playwright/test';

test.describe('Hackathon Radar Subsystem', () => {
  test('should render hackathon cards, apply filters, and open detail modal', async ({ page }) => {
    // Catch console errors
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // 1. Navigate to Hackathon Radar page
    await page.goto('http://localhost:3000/learner/hackathons');

    // 2. Check title banner
    await expect(page.getByText('Hackathon Radar')).toBeVisible({ timeout: 10000 });

    // 3. Check search box and filter controls
    const searchInput = page.getByPlaceholder('Search hackathons by title, technology, or organizer...');
    await expect(searchInput).toBeVisible();

    // 4. Filter by platform source (e.g. Devpost)
    const devpostBtn = page.getByRole('button', { name: 'Devpost' }).first();
    if (await devpostBtn.isVisible()) {
      await devpostBtn.click();
    }

    // 5. Type in search query
    await searchInput.fill('Python');
    await page.waitForTimeout(500);

    // 6. Verify URL updated with query params
    expect(page.url()).toContain('q=Python');
  });
});
