import { chromium } from 'playwright';

async function testDisasterData() {
  console.log('🚀 Starting Playwright test for disaster data...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Step 1: Navigate to the application
    console.log('📍 Navigating to http://localhost:8082...');
    await page.goto('http://localhost:8082', { waitUntil: 'networkidle' });
    
    // Wait a bit for any initial data loading
    await page.waitForTimeout(3000);

    // Step 2: Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: 'initial-state.png', fullPage: true });

    // Step 3: Check if disaster data is showing
    console.log('🔍 Checking for disaster data tiles...');
    
    // Look for state tiles or disaster count elements
    const stateTiles = await page.locator('[data-testid*="state"], .state-tile, .disaster-tile, .grid div').count();
    console.log(`Found ${stateTiles} potential state/disaster tiles`);

    // Look for disaster counts or numbers
    const disasterCounts = await page.locator('text=/\\d+.*disaster|disaster.*\\d+/i').count();
    console.log(`Found ${disasterCounts} elements with disaster counts`);

    // Check for last updated timestamp
    const lastUpdated = await page.locator('text=/last updated|updated/i').count();
    console.log(`Found ${lastUpdated} "last updated" elements`);

    // Step 4: Look for and click refresh button
    console.log('🔄 Looking for refresh button...');
    
    const refreshSelectors = [
      'button:has-text("Refresh")',
      'button:has-text("refresh")',
      'button:has-text("Sync")',
      'button:has-text("Update")',
      '[data-testid="refresh-button"]',
      '.refresh-button'
    ];

    let refreshButton = null;
    for (const selector of refreshSelectors) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        refreshButton = button.first();
        console.log(`✅ Found refresh button with selector: ${selector}`);
        break;
      }
    }

    if (refreshButton) {
      // Step 5: Click refresh and wait for sync
      console.log('🔄 Clicking refresh button...');
      await refreshButton.click();
      
      // Wait for any loading indicators or network activity
      await page.waitForTimeout(5000);
      
      // Look for loading indicators
      const loadingIndicators = await page.locator('text=/loading|syncing|updating/i').count();
      if (loadingIndicators > 0) {
        console.log('⏳ Found loading indicators, waiting for completion...');
        await page.waitForSelector('text=/loading|syncing|updating/i', { state: 'detached', timeout: 30000 });
      }
      
      // Step 6: Take screenshot after refresh
      console.log('📸 Taking screenshot after refresh...');
      await page.screenshot({ path: 'after-refresh.png', fullPage: true });
    } else {
      console.log('❌ No refresh button found');
    }

    // Step 7: Analyze the data to determine if it's real or fake
    console.log('🔍 Analyzing data authenticity...');
    
    const pageContent = await page.content();
    
    // Check for obvious test/fake data patterns
    const fakeDataIndicators = [
      /test.*disaster/i,
      /sample.*data/i,
      /lorem ipsum/i,
      /placeholder/i,
      /mock.*data/i,
      /fake.*disaster/i
    ];

    const realDataIndicators = [
      /bushfire/i,
      /flood/i,
      /cyclone/i,
      /drought/i,
      /nsw|vic|qld|wa|sa|tas|nt|act/i,
      /australia/i,
      /emergency/i
    ];

    let fakeScore = 0;
    let realScore = 0;

    fakeDataIndicators.forEach(pattern => {
      if (pattern.test(pageContent)) {
        fakeScore++;
        console.log(`❌ Found fake data indicator: ${pattern}`);
      }
    });

    realDataIndicators.forEach(pattern => {
      if (pattern.test(pageContent)) {
        realScore++;
        console.log(`✅ Found real data indicator: ${pattern}`);
      }
    });

    // Get text content for manual review
    const bodyText = await page.locator('body').textContent();
    
    // Step 8: Generate report
    const report = {
      timestamp: new Date().toISOString(),
      stateTiles: stateTiles,
      disasterCounts: disasterCounts,
      lastUpdatedElements: lastUpdated,
      refreshButtonFound: refreshButton !== null,
      fakeDataScore: fakeScore,
      realDataScore: realScore,
      dataAuthenticity: realScore > fakeScore ? 'REAL' : (fakeScore > realScore ? 'FAKE' : 'UNCLEAR'),
      pageContentSample: bodyText.substring(0, 1000) + '...'
    };

    console.log('\n📊 TEST REPORT:');
    console.log('================');
    console.log(`State/Disaster Tiles Found: ${report.stateTiles}`);
    console.log(`Disaster Count Elements: ${report.disasterCounts}`);
    console.log(`Last Updated Elements: ${report.lastUpdatedElements}`);
    console.log(`Refresh Button Found: ${report.refreshButtonFound}`);
    console.log(`Fake Data Score: ${report.fakeDataScore}`);
    console.log(`Real Data Score: ${report.realDataScore}`);
    console.log(`Data Authenticity: ${report.dataAuthenticity}`);
    console.log('\n📝 Page Content Sample:');
    console.log(report.pageContentSample);

    return report;

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testDisasterData()
  .then(report => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });