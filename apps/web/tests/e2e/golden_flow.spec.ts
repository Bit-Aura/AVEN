import { test, expect } from '@playwright/test';

test.describe('AVEN PathFinder Golden Flow', () => {
  test('should go through the full user journey successfully', async ({ page }) => {
    // Catch console errors and page errors to debug client-side crashes
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
    });

    // 1. Visit Home
    await page.goto('http://localhost:3000');
    
    // Check initial state (should show GoalChat)
    await expect(page.getByPlaceholder('e.g. I want to become a Backend Engineer in four months...')).toBeVisible();

    // 2. Submit Goal
    const input = page.getByPlaceholder('e.g. I want to become a Backend Engineer in four months...');
    await input.fill('I want to become a backend engineer in four months');
    await input.press('Enter');

    // Wait for DiagnosticChat to appear
    await expect(page.getByText('Quick Diagnostic')).toBeVisible({ timeout: 15000 });

    // 3. Answer Diagnostic (click the first option 3 times)
    for (let i = 0; i < 3; i++) {
      const optionButton = page.locator('button.w-full.text-left.p-4').first();
      await optionButton.waitFor({ state: 'visible', timeout: 5000 });
      await optionButton.click();
      // wait a bit for the next question to load
      await page.waitForTimeout(1000);
    }

    // 4. Verify Path Generation (SkillGraph should load)
    await expect(page.getByText('Prove I know this')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
    
    // 5. Open AI Coach Drawer
    await page.getByText('Need Help').click();
    
    // Verify Drawer opens and AI types
    await expect(page.getByPlaceholder('Ask your coach...')).toBeVisible();
    
    // 6. Test Prove It Checkpoint
    await page.getByTestId('close-coach').click();
    
    await page.getByText('Prove I know this').click();
    
    // Wait for assessment question to load
    try {
      await expect(page.getByText('Submit Answer')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log(await page.content());
      throw e;
    }
    const assessmentOption = page.locator('button.w-full.text-left.p-4').first();
    await assessmentOption.click();
    
    await page.getByText('Submit Answer').click();
    
  });
});
