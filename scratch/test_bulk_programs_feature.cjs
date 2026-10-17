const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('Starting Playwright test for Bulk Upload Programs and Upsert functionality...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('Browser Error:', msg.text());
  });

  try {
    // 1. Navigate to application
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // 2. Login as COE if login screen shown
    const loginButton = page.locator('button:has-text("Sign In to Portal"), button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Logging in as COE...');
      await page.fill('input[type="email"]', 'coe@sspu.ac.in');
      await page.fill('input[type="password"]', 'Admin@123');
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 3. Navigate to Programs Manager view
    console.log('Navigating to Programs Manager...');
    const programsNavLink = page.locator('button:has-text("Programme & Member Mapping")').first();
    await programsNavLink.click();
    await page.waitForTimeout(1000);

    // Ensure we are on programs view
    const heading = page.locator('h2:has-text("Academic Program & Faculty Coordinator Directory")');
    await heading.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Programs Manager directory is visible!');

    // Check count of programs
    const badge = page.locator('span:has-text("Programs")').first();
    console.log('Directory badge:', await badge.textContent());

    // 4. Verify Bulk Upload Programs button exists
    const bulkUploadBtn = page.locator('button:has-text("Bulk Upload Programs")');
    if (!await bulkUploadBtn.isVisible()) {
      throw new Error('Bulk Upload Programs button not visible!');
    }
    console.log('SUCCESS: Bulk Upload Programs button is visible.');

    // 5. Click Bulk Upload Programs
    await bulkUploadBtn.click();
    await page.waitForTimeout(600);

    const modalTitle = page.locator('h3:has-text("Bulk Upload Academic Programs & Coordinators")');
    await modalTitle.waitFor({ state: 'visible', timeout: 3000 });
    console.log('SUCCESS: Bulk Upload Modal opened successfully.');

    // 6. Verify Template download button and Preload Preset button
    const downloadTemplateBtn = page.locator('button:has-text("Download Template (.xlsx)")');
    const preloadPresetBtn = page.locator('button:has-text("Preload SSPU Master Preset")');
    if (!await downloadTemplateBtn.isVisible() || !await preloadPresetBtn.isVisible()) {
      throw new Error('Template or Preset button missing in modal!');
    }
    console.log('SUCCESS: Download Template and Preload Preset buttons are present.');

    // 7. Check if preset loaded items
    const parsedHeading = page.locator('h4:has-text("Parsed Records")');
    await parsedHeading.waitFor({ state: 'visible', timeout: 3000 });
    console.log('Parsed items heading:', await parsedHeading.textContent());

    // Check action badges (UPDATE / NEW)
    const updateBadges = page.locator('span:has-text("UPDATE")');
    const updateCount = await updateBadges.count();
    console.log(`Found ${updateCount} rows marked with UPDATE badge.`);

    // Take screenshot of Bulk Upload Modal
    await page.screenshot({ path: 'scratch/bulk_upload_modal.png', fullPage: false });
    console.log('Saved screenshot to scratch/bulk_upload_modal.png');

    // 8. Test Commit & Synchronize
    const commitBtn = page.locator('button:has-text("Commit & Synchronize")');
    await commitBtn.click();
    console.log('Clicked Commit & Synchronize button...');

    // Wait for success toast / message
    const successMsg = page.locator('text=Successfully synchronized');
    await successMsg.waitFor({ state: 'visible', timeout: 5000 });
    console.log('SUCCESS: Synchronize success message displayed!');

    // Wait for modal to close automatically
    await page.waitForTimeout(2000);
    console.log('Modal closed. Verifying updated registry in table...');

    // Take screenshot of main table
    await page.screenshot({ path: 'scratch/programs_directory_updated.png', fullPage: false });
    console.log('Saved screenshot to scratch/programs_directory_updated.png');

    // Verify program rows in table
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    console.log(`Total programs rendered in directory table: ${rowCount}`);

    if (rowCount < 5) {
      throw new Error(`Expected at least 5 programs rendered, found ${rowCount}`);
    }

    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed:', err);
    await page.screenshot({ path: 'scratch/error_test.png' }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
