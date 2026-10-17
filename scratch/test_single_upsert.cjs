const { chromium } = require('playwright');

async function testSingleUpsert() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000');
  
  const loginButton = page.locator('button:has-text("Sign In to Portal"), button:has-text("Sign In")').first();
  if (await loginButton.isVisible().catch(() => false)) {
    await page.fill('input[type="email"]', 'coe@sspu.ac.in');
    await page.fill('input[type="password"]', 'Admin@123');
    await loginButton.click();
    await page.waitForTimeout(1000);
  }

  await page.locator('button:has-text("Programme & Member Mapping")').first().click();
  await page.waitForTimeout(1000);

  // Click Add Program
  await page.locator('button:has-text("Add Program")').click();
  await page.waitForTimeout(500);

  // Handle the confirm dialog automatically
  page.on('dialog', async dialog => {
    console.log('Dialog prompt message:', dialog.message());
    await dialog.accept();
  });

  // Fill in existing code BTECH-CEM with new name
  await page.fill('input[placeholder*="BTECH-AI"]', 'BTECH-CEM');
  await page.fill('input[placeholder*="Artificial Intelligence"]', 'B.Tech. Construction Engg and Management (Updated Name)');
  await page.click('button:has-text("Register / Update Program")');
  await page.waitForTimeout(1500);

  const updatedCell = page.locator('div:has-text("B.Tech. Construction Engg and Management (Updated Name)")').first();
  const isUpdated = await updatedCell.isVisible();
  console.log('Single program update result: was updated cell visible?', isUpdated);

  // Revert back name
  await page.locator('button:has-text("Add Program")').click();
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="BTECH-AI"]', 'BTECH-CEM');
  await page.fill('input[placeholder*="Artificial Intelligence"]', 'B.Tech. Construction Engineering & Management');
  await page.click('button:has-text("Register / Update Program")');
  await page.waitForTimeout(1500);

  console.log('Single program upsert check finished successfully!');
  await browser.close();
}

testSingleUpsert();
