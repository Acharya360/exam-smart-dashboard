import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);
  
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.count() > 0) {
    await emailInput.fill('coe@sspu.ac.in');
    await page.locator('input[type="password"]').fill('Admin@123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
  }
  
  console.log('Finding Tabulation Register buttons...');
  const btns = await page.locator('button:has-text("Tabulation Register")').all();
  console.log('Count:', btns.length);
  for (let i = 0; i < btns.length; i++) {
    console.log(`Button #${i}: "${await btns[i].innerText()}", visible: ${await btns[i].isVisible()}`);
  }
  
  if (btns.length > 0) {
    // If it's inside a closed accordion, let's check
    await btns[0].scrollIntoViewIfNeeded();
    await btns[0].click({ force: true });
    console.log('Waiting for .tr-sheet-page...');
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(1000);
      const c = await page.locator('.tr-sheet-page').count();
      if (c > 0) {
        console.log(`Found ${c} tr-sheet-pages at T+${i+1}s!`);
        const first = page.locator('.tr-sheet-page').first();
        console.log('first.isVisible():', await first.isVisible());
        console.log('first.boundingBox():', await first.boundingBox());
        const sspu = page.locator('text=SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY');
        console.log('sspu count:', await sspu.count());
        console.log('sspu first isVisible:', await sspu.first().isVisible());
        break;
      }
    }
  }
  await browser.close();
}

main().catch(console.error);
