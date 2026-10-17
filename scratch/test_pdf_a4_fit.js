import { chromium } from 'playwright';
import fs from 'fs';

async function testPdfFit() {
  console.log('Testing TR Sheet A4 Page Fit Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('coe@sspu.ac.in');
      await page.locator('input[type="password"]').fill('Admin@123');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
    }

    // 2. Go to Tabulation Register
    console.log('2. Navigating to Tabulation Register...');
    await page.locator('button.nav-item:has-text("Tabulation Register")').click();
    await page.waitForTimeout(1500);

    // Wait for the TR sheets to render
    await page.locator('.tr-sheet-page').first().waitFor({ state: 'attached', timeout: 60000 });
    const totalStudents = await page.locator('.tr-sheet-page').count();
    console.log(`   Found ${totalStudents} rendered student TR sheets in view.`);

    // Helper to count PDF pages using regex on PDF syntax
    function getPdfPageCount(buffer) {
      const text = buffer.toString('latin1');
      const matches = text.match(/\/Type\s*\/Page\b/g);
      return matches ? matches.length : 0;
    }

    // 3. Test Single Student Print
    console.log('3. Testing single student selection...');
    // Select the first student from the Display Scope dropdown
    const selectScope = page.locator('select').filter({ hasText: 'Consolidated Semester Register' });
    // Pick the second option (first individual student)
    const options = await selectScope.locator('option').allInnerTexts();
    console.log(`   Display Scope options count: ${options.length}`);
    if (options.length > 1) {
      const firstIndividualPRN = (await selectScope.locator('option').nth(1).getAttribute('value')) || '';
      console.log(`   Selecting individual student PRN: ${firstIndividualPRN}...`);
      await selectScope.selectOption(firstIndividualPRN);
      await page.waitForTimeout(500);

      const singleStudentCount = await page.locator('.tr-sheet-page').count();
      console.log(`   Rendered sheets for single student: ${singleStudentCount}`);

      // Generate PDF in A4 landscape mode
      console.log('   Generating PDF for 1 student...');
      const singlePdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true
      });
      fs.writeFileSync('scratch/single_student_test.pdf', singlePdfBuffer);
      const singlePageCount = getPdfPageCount(singlePdfBuffer);
      console.log(`   --> Single Student PDF Page Count: ${singlePageCount}`);
      if (singlePageCount !== 1) {
        throw new Error(`Expected 1 page for single student, but got ${singlePageCount} pages!`);
      }
      console.log('   ✔ PASS: Single student fits on EXACTLY 1 A4 page!');
    }

    // 4. Test Multi-Student Filtered Print (e.g. 2-5 students)
    console.log('4. Testing multi-student search-filtered print...');
    // Reset to all students
    const resetBtn = page.getByText('Reset to All Students');
    if (await resetBtn.count() > 0) {
      await resetBtn.click();
    } else {
      await selectScope.selectOption('');
    }
    await page.waitForTimeout(500);

    // Search for a specific 3-digit student prefix to get a small batch of students
    const searchInput = page.locator('input[placeholder="Search by student name or PRN..."]');
    await searchInput.fill('100');
    await page.waitForTimeout(500);

    const filteredCount = await page.locator('.tr-sheet-page').count();
    console.log(`   Filtered students count for '100': ${filteredCount}`);

    console.log(`   Generating PDF for ${filteredCount} students...`);
    const batchPdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true
    });
    fs.writeFileSync('scratch/filtered_students_test.pdf', batchPdfBuffer);
    const batchPagesCount = getPdfPageCount(batchPdfBuffer);
    console.log(`   --> Batch PDF Total Pages: ${batchPagesCount} for ${filteredCount} students`);
    if (batchPagesCount !== filteredCount) {
      throw new Error(`Expected ${filteredCount} pages (1 per student), but got ${batchPagesCount} pages!`);
    }
    console.log(`   ✔ PASS: All ${filteredCount} students fit on EXACTLY ${filteredCount} A4 pages (1 page per student, 0 spillover)!`);

    console.log('\n=== ALL A4 FIT VERIFICATIONS PASSED (100%) ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testPdfFit();
