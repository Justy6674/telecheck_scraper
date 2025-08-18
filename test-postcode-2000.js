import { chromium } from 'playwright';

(async () => {
  console.log('Starting Playwright test for postcode 2000...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the site
    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-page.png', fullPage: true });
    console.log('Initial page screenshot saved');
    
    // Enter postcode 2000
    console.log('Entering postcode 2000...');
    await page.fill('input[type="text"]', '2000');
    
    // Click Verify button
    console.log('Clicking Verify button...');
    await page.click('button:has-text("Verify")');
    
    // Wait for results to load
    console.log('Waiting for results...');
    await page.waitForTimeout(3000);
    
    // Take screenshot of results
    await page.screenshot({ path: 'results-2000.png', fullPage: true });
    console.log('Results screenshot saved');
    
    // Extract disaster information
    const results = await page.evaluate(() => {
      const resultElements = document.querySelectorAll('[data-testid="disaster-item"], .disaster-item, .disaster-card, .disaster');
      const disasters = [];
      
      resultElements.forEach(el => {
        const title = el.querySelector('h3, h4, .disaster-name, .title')?.textContent?.trim();
        const description = el.querySelector('p, .description, .disaster-description')?.textContent?.trim();
        const status = el.querySelector('.status, .disaster-status')?.textContent?.trim();
        
        if (title) {
          disasters.push({
            title,
            description,
            status
          });
        }
      });
      
      // If no specific disaster items found, get all text content from results area
      if (disasters.length === 0) {
        const resultsArea = document.querySelector('#results, .results, .disaster-results, main');
        if (resultsArea) {
          return {
            allText: resultsArea.textContent.trim(),
            disasters: []
          };
        }
      }
      
      return {
        disasters,
        allText: document.body.textContent.trim()
      };
    });
    
    console.log('\n=== DISASTER CHECK RESULTS FOR POSTCODE 2000 ===');
    console.log('Number of disasters found:', results.disasters.length);
    
    if (results.disasters.length > 0) {
      results.disasters.forEach((disaster, index) => {
        console.log(`\nDisaster ${index + 1}:`);
        console.log(`Title: ${disaster.title}`);
        if (disaster.description) console.log(`Description: ${disaster.description}`);
        if (disaster.status) console.log(`Status: ${disaster.status}`);
      });
    } else {
      console.log('\nNo specific disaster items found. Full page content:');
      console.log(results.allText.substring(0, 1000) + '...');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
})();