const { chromium } = require('playwright');

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const tabs = [
    { url: 'http://localhost:3000/data-table', name: 'data-table', wait: 3000 },
    { url: 'http://localhost:3000/trend-tool', name: 'trend-tool', wait: 4000 },
    { url: 'http://localhost:3000/weekly-box-score', name: 'weekly-box-score', wait: 4000 },
    { url: 'http://localhost:3000/fantasy-analyzer', name: 'fantasy-analyzer', wait: 4000 },
  ];

  for (const tab of tabs) {
    console.log(`Taking screenshot of ${tab.name}...`);
    await page.goto(tab.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(tab.wait); // Wait for data to load
    await page.screenshot({ path: `screenshot-${tab.name}.png`, fullPage: false });
    console.log(`  Saved screenshot-${tab.name}.png`);
  }

  await browser.close();
  console.log('Done! All screenshots saved.');
}

takeScreenshots().catch(console.error);
