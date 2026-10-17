import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('1. Loading localhost:3000...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.count() > 0) {
    console.log('Logging in...');
    await emailInput.fill('coe@sspu.ac.in');
    await page.locator('input[type="password"]').fill('Admin@123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
  }

  console.log('2. Clicking Tabulation Register nav...');
  await page.locator('button.nav-item:has-text("Tabulation Register")').click();

  console.log('3. Polling for .tr-sheet-page...');
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2000);
    const count = await page.locator('.tr-sheet-page').count();
    const loadingCount = await page.locator('text=Generating Tabulation Registers').count();
    const noRecCount = await page.locator('text=No Tabulation Register Records Found').count();
    const selects = await page.locator('select').allInnerTexts();
    console.log(`[T+${(i+1)*2}s] .tr-sheet-page: ${count}, loading: ${loadingCount}, noRecords: ${noRecCount}, selects: ${selects.length}`);
    if (count > 0) {
      console.log('SUCCESS! Found rendered student sheets:', count);
      break;
    }
  }

  await browser.close();
}

main().catch(console.error);
