const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function recordMotionVideo() {
  const outputDir = path.join(__dirname, '..', 'public', 'videos');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching Chromium for 1080p 60fps video capture...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000');

  // Check login
  const loginBtn = page.locator('button:has-text("Sign In")');
  if (await loginBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    console.log('Logging in as COE...');
    await page.locator('input[type="email"]').fill('coe@sspu.ac.in');
    await page.locator('input[type="password"]').fill('Admin@123');
    await loginBtn.click();
    await page.waitForTimeout(2000);
  }

  console.log('Opening full-screen Motion Video theater modal...');
  const headerBtn = page.locator('button[title="Experience Project Motion Video Showcase"]');
  if (await headerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await headerBtn.click();
  } else {
    await page.locator('button:has-text("Project Motion Video")').click();
  }

  await page.waitForTimeout(1000);

  // Chapters sequence:
  // Prologue (~6.5s) -> Command Center (~7.0s) -> 4-Phase Suite (~7.5s) -> RBAC & RLS (~7.0s) -> Academic Engine (~7.0s) -> Grand Finale (~8.5s)
  // Total ~ 44 seconds.
  console.log('Recording 44 seconds of cinematic motion graphics across all 6 scenes...');
  const totalMs = 44000;
  const stepMs = 5000;
  let elapsed = 0;

  while (elapsed < totalMs) {
    await page.waitForTimeout(stepMs);
    elapsed += stepMs;
    console.log(`Recorded ${elapsed / 1000}s / ${totalMs / 1000}s...`);
  }

  console.log('Closing page to finalize video stream...');
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const rawPath = await video.path();
    const targetWebm = path.join(outputDir, 'Acharya360-ExamTrack-Motion-Showcase.webm');
    if (fs.existsSync(targetWebm)) fs.unlinkSync(targetWebm);
    fs.renameSync(rawPath, targetWebm);
    console.log('✅ WebM Video successfully saved to:', targetWebm);

    // Convert to MP4
    const targetMp4 = path.join(outputDir, 'Acharya360-ExamTrack-Motion-Showcase.mp4');
    try {
      console.log('Rendering MP4 format with ffmpeg...');
      execSync(`ffmpeg -y -i "${targetWebm}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 22 "${targetMp4}"`, { stdio: 'inherit' });
      console.log('✅ MP4 Video successfully saved to:', targetMp4);
    } catch (e) {
      console.warn('ffmpeg note:', e.message);
    }
  }
}

recordMotionVideo().catch((err) => {
  console.error('Recording error:', err);
  process.exit(1);
});
