const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Login
  const btn = page.locator('button:has-text("Sign In")').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.fill('input[type="email"]', 'coe@sspu.ac.in');
    await page.fill('input[type="password"]', 'Admin@123');
    await btn.click();
    await page.waitForTimeout(1500);
  }

  // Dashboard screenshot
  await page.screenshot({ path: 'scratch/sidebar_v2_dashboard.png', fullPage: false });

  // Navigate to Programs to show a different active item
  await page.locator('button:has-text("Programme")').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scratch/sidebar_v2_programs.png', fullPage: false });

  console.log('Done! Screenshots in scratch/');
  await browser.close();
})();
