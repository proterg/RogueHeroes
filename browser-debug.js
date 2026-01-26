/**
 * Browser Debug Script
 * --------------------
 * Uses Puppeteer to capture screenshots and console logs
 * for debugging the game in a headless browser.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function debugPage(url, options = {}) {
  const {
    waitTime = 3000,
    screenshotName = 'debug',
    headless = true,
  } = options;

  console.log(`\n=== Browser Debug ===`);
  console.log(`URL: ${url}`);
  console.log(`Headless: ${headless}`);

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1280, height: 720 });

  // Capture ALL console messages with full details
  const consoleLogs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
    const logEntry = `[${msg.type()}] ${args.join(' ')}`;
    consoleLogs.push(logEntry);
    console.log(`CONSOLE: ${logEntry}`);
  });

  // Capture errors
  page.on('pageerror', err => {
    console.log(`\n!!! PAGE ERROR !!!`);
    console.log(err.message);
    console.log(err.stack);
    consoleLogs.push(`[PAGE ERROR] ${err.message}\n${err.stack}`);
  });

  // Capture request failures with URL
  page.on('requestfailed', request => {
    const failure = request.failure();
    console.log(`\n!!! REQUEST FAILED !!!`);
    console.log(`URL: ${request.url()}`);
    console.log(`Error: ${failure?.errorText}`);
    consoleLogs.push(`[REQUEST FAILED] ${request.url()} - ${failure?.errorText}`);
  });

  // Log all network requests
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      console.log(`HTTP ${status}: ${response.url()}`);
    }
  });

  try {
    console.log(`\nNavigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log(`Waiting ${waitTime}ms for page to render...`);
    await new Promise(r => setTimeout(r, waitTime));

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${screenshotName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`\nScreenshot saved: ${screenshotPath}`);

    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check for canvas element (Phaser)
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        return {
          exists: true,
          width: canvas.width,
          height: canvas.height,
        };
      }
      return { exists: false };
    });
    console.log(`Canvas info:`, canvasInfo);

    // Try to get Phaser game state
    const gameInfo = await page.evaluate(() => {
      if (typeof window !== 'undefined' && window.Phaser) {
        const games = Phaser.GAMES || [];
        if (games.length > 0) {
          const game = games[0];
          return {
            isRunning: game.isRunning,
            scenesCount: game.scene.scenes?.length || 0,
            activeScenes: game.scene.scenes?.filter(s => s.sys?.isActive).map(s => s.sys?.settings?.key) || [],
          };
        }
      }
      return { error: 'No Phaser game found' };
    });
    console.log(`Phaser game info:`, gameInfo);

    // Summary
    console.log(`\n=== Summary ===`);
    console.log(`Console logs: ${consoleLogs.length}`);
    if (consoleLogs.some(l => l.includes('ERROR') || l.includes('error'))) {
      console.log('\nERRORS FOUND:');
      consoleLogs.filter(l => l.toLowerCase().includes('error')).forEach(l => console.log(l));
    }
    console.log(`Screenshot: ${screenshotPath}`);

    return {
      screenshot: screenshotPath,
      logs: consoleLogs,
      canvasInfo,
      gameInfo,
    };

  } catch (error) {
    console.error(`Error: ${error.message}`);

    // Try to take screenshot even on error
    const errorScreenshotPath = path.join(SCREENSHOT_DIR, `${screenshotName}-error.png`);
    try {
      await page.screenshot({ path: errorScreenshotPath });
      console.log(`Error screenshot saved: ${errorScreenshotPath}`);
    } catch (e) {
      console.log(`Could not take error screenshot`);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
const url = process.argv[2] || 'http://localhost:3001';
const waitTime = parseInt(process.argv[3]) || 5000;

debugPage(url, { waitTime, screenshotName: 'game-debug' })
  .then(result => {
    console.log('\nDebug complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nDebug failed:', err.message);
    process.exit(1);
  });
