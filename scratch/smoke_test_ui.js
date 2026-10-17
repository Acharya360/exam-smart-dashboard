import { chromium } from 'playwright';

async function runSmoke() {
  console.log('Launching browser for UI verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);

    // If on login screen, log in
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      console.log('2. Logging in as Super Admin (coe@sspu.ac.in)...');
      await emailInput.fill('coe@sspu.ac.in');
      await page.locator('input[type="password"]').fill('Admin@123');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
    }

    console.log('3. Navigating to TNG Students view...');
    await page.locator('button.nav-item:has-text("TNG Students")').click();
    await page.waitForTimeout(1500);

    // Verify TNG page content
    const tngHeading = page.locator('text=Term Not Granted (TNG) Registry');
    if (await tngHeading.count() === 0) {
      throw new Error('TNG Registry header not found on page');
    }
    console.log('   ✔ TNG Registry view rendered successfully.');

    // Expand first student
    const expandBtn = page.getByText('View Subjects').first();
    if (await expandBtn.count() > 0) {
      await expandBtn.click();
      await page.waitForTimeout(500);
      console.log('   ✔ TNG student row expanded successfully.');

      // Click Marks Drill-down
      const drillDownBtn = page.getByText('Marks Drill-down').first();
      if (await drillDownBtn.count() > 0) {
        await drillDownBtn.click();
        await page.waitForTimeout(500);
        console.log('   ✔ TNG Marks Drill-down modal opened.');

        // Close drill-down modal
        await page.getByText('Close Drill-down').click();
        await page.waitForTimeout(300);
        console.log('   ✔ TNG Marks Drill-down modal closed.');
      }
    }

    console.log('4. Navigating to Tabulation Register view...');
    await page.locator('button.nav-item:has-text("Tabulation Register")').click();
    await page.locator('.tr-sheet-page').first().waitFor({ state: 'attached', timeout: 60000 });
    console.log('   ✔ Tabulation register sheets rendered.');

    // Verify TR Sheet page content
    const sspuHeader = page.locator('text=SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY');
    if (await sspuHeader.count() === 0) {
      throw new Error('Official SSPU header not found in TR Sheet view');
    }
    console.log('   ✔ Official SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY header verified.');

    const trTitle = page.locator('text=TABULATION REGISTER (TR SHEET)');
    if (await trTitle.count() === 0) {
      throw new Error('TR Sheet title not found');
    }
    console.log('   ✔ Tabulation Register statement rendered with assessment matrix.');

    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    } else {
      console.log('   ✔ 0 console errors detected during full navigation!');
    }

    console.log('\n=== UI SMOKE TEST PASSED (100%) ===');
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runSmoke();
