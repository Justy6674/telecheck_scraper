import { chromium } from 'playwright';

async function testPostcodes() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Slow down actions for better debugging
  });
  const page = await browser.newPage();
  
  const testCases = [
    { postcode: '4000', location: 'Brisbane', expectedDisaster: 'Brisbane River Flooding Crisis' },
    { postcode: '2000', location: 'Sydney', expectedDisaster: 'Sydney Harbour Flooding' },
    { postcode: '3000', location: 'Melbourne', expectedDisaster: 'Melbourne Metro Flooding' },
    { postcode: '5000', location: 'Adelaide', expectedDisaster: 'Adelaide Hills Fire' }
  ];

  console.log('🌍 Testing Disaster Check AU - Postcode Verification');
  console.log('=' .repeat(60));

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing ${testCase.location} (${testCase.postcode})`);
    console.log(`Expected: ${testCase.expectedDisaster}`);
    
    try {
      // Navigate to the application
      await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for the React app to load
      await page.waitForSelector('#root', { timeout: 10000 });
      await page.waitForSelector('input[placeholder*="postcode"]', { timeout: 10000 });
      
      // Clear any existing input and enter the postcode
      await page.fill('input[placeholder*="postcode"]', '');
      await page.fill('input[placeholder*="postcode"]', testCase.postcode);
      
      // Wait for the Verify button to be visible and click it
      await page.waitForSelector('button:has-text("Verify")', { timeout: 5000 });
      await page.click('button:has-text("Verify")');
      
      // Wait for results to load (Alert component)
      try {
        await page.waitForSelector('.border-success, .border-muted', { timeout: 10000 });
      } catch (e) {
        console.log('Waiting for results to appear...');
        await page.waitForTimeout(3000);
      }
      
      // Take screenshot
      const screenshotPath = `/Users/jb-downscale/Downloads/disaster-check-au/test-results-${testCase.postcode}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Get all text content from the page
      const pageContent = await page.textContent('body');
      
      // Look for specific disaster information using more targeted selectors
      const disasterInfo = await page.evaluate(() => {
        const results = [];
        
        // Look for disaster zone confirmation
        const disasterZoneElement = document.querySelector('.text-orange-700, .text-green-700');
        if (disasterZoneElement) {
          results.push(`Status: ${disasterZoneElement.textContent}`);
        }
        
        // Look for disaster descriptions in the Active Disasters section
        const disasterElements = document.querySelectorAll('.bg-orange-50 .font-medium.text-orange-900');
        disasterElements.forEach(el => {
          if (el.textContent) {
            results.push(`Disaster: ${el.textContent}`);
          }
        });
        
        // Look for suburb and postcode info
        const locationElement = document.querySelector('[class*="MapPin"] + span');
        if (locationElement) {
          results.push(`Location: ${locationElement.textContent}`);
        }
        
        // Check for any text containing key disaster terms
        const allText = document.body.textContent || '';
        const disasterTerms = [
          'Brisbane River Flooding Crisis',
          'Sydney Harbour Flooding', 
          'Melbourne Metro Flooding',
          'Adelaide Hills Fire',
          'Flooding Crisis',
          'Brisbane River',
          'Sydney Harbour',
          'Melbourne Metro',
          'Adelaide Hills'
        ];
        
        disasterTerms.forEach(term => {
          if (allText.includes(term)) {
            results.push(`Found term: ${term}`);
          }
        });
        
        return results;
      });
      
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
      console.log(`📄 Disaster information found:`);
      
      if (disasterInfo.length > 0) {
        disasterInfo.forEach((info, index) => {
          console.log(`   ${index + 1}. ${info}`);
        });
        
        // Check if expected disaster is found
        const fullPageText = disasterInfo.join(' ').toLowerCase();
        const expectedTerms = [
          testCase.expectedDisaster.toLowerCase(),
          testCase.location.toLowerCase() + ' river',
          testCase.location.toLowerCase() + ' harbour',
          testCase.location.toLowerCase() + ' metro',
          testCase.location.toLowerCase() + ' hills'
        ];
        
        const expectedFound = expectedTerms.some(term => fullPageText.includes(term));
        
        if (expectedFound) {
          console.log(`✅ SUCCESS: Expected disaster information found for ${testCase.location}`);
        } else {
          console.log(`❌ PARTIAL: Some information found but not the exact expected disaster for ${testCase.location}`);
        }
      } else {
        console.log(`❌ FAILED: No disaster information found for ${testCase.location}`);
        console.log(`📝 Page content preview: ${pageContent?.slice(0, 300)}...`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR testing ${testCase.location}: ${error.message}`);
    }
    
    console.log('-'.repeat(50));
  }
  
  await browser.close();
  
  console.log('\n🎯 Test Summary Complete');
  console.log('Check screenshots in the project directory for visual verification');
}

// Run the test
testPostcodes().catch(console.error);