import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000');
  
  const emailInput = page.locator('input[type="email"]');
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 3000 });
    console.log('Logging in as coe@sspu.ac.in...');
    await emailInput.fill('coe@sspu.ac.in');
    await page.locator('input[type="password"]').fill('Admin@123');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('.app-sidebar', { timeout: 10000 });
    console.log('Login successful, sidebar visible!');
  } catch {
    console.log('Already logged in or login not shown');
  }
  
  await page.waitForTimeout(1000);
  console.log('Clicking Programme nav...');
  await page.locator('button.nav-item:has-text("Programme")').click();
  await page.waitForTimeout(3000);
  const rows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Programs rows count:', rows.length);
  for (let r of rows) console.log('Row:', r.replace(/\n+/g, ' | '));
  await browser.close();
}

main().catch(console.error);
