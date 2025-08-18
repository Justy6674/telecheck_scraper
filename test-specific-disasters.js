import { chromium } from 'playwright';

async function testDisasterSpecifics() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Starting TeleCheck disaster specifics test...');
    
    // 1. Go to the main page
    console.log('1. Loading http://localhost:8080...');
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of main page
    await page.screenshot({ path: './test-results/1-main-page.png', fullPage: true });
    console.log('📸 Screenshot saved: 1-main-page.png');
    
    // 2. Test postcode 4000 (Brisbane)
    console.log('\n2. Testing postcode 4000 (Brisbane)...');
    const postcodeInput = await page.locator('input[placeholder*="postcode" i], input[placeholder*="4000" i], input[type="text"]').first();
    await postcodeInput.fill('4000');
    
    const quickCheckButton = await page.locator('button:has-text("Quick Check"), button:has-text("Check"), button[type="submit"]').first();
    await quickCheckButton.click();
    
    // Wait for results to load
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './test-results/2-postcode-4000-results.png', fullPage: true });
    console.log('📸 Screenshot saved: 2-postcode-4000-results.png');
    
    // Check what disaster information is shown
    const resultText = await page.textContent('body');
    console.log('🔍 4000 Results found:', resultText.includes('No Current Declaration') ? 'No Current Declaration' : 'Contains disaster info');
    
    // Look for specific disaster names
    const disasterPatterns = [
      'Queensland Flooding',
      'Cyclone',
      'Bushfire',
      'Flood',
      'Disaster Declaration',
      'Emergency',
      'DISASTER EXEMPTION'
    ];
    
    const foundDisasters = disasterPatterns.filter(pattern => 
      resultText.toLowerCase().includes(pattern.toLowerCase())
    );
    
    console.log('🎯 Specific disasters found for 4000:', foundDisasters.length > 0 ? foundDisasters : 'None');
    
    // 3. Test postcode 2000 (Sydney)
    console.log('\n3. Testing postcode 2000 (Sydney)...');
    await postcodeInput.fill('2000');
    await quickCheckButton.click();
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './test-results/3-postcode-2000-results.png', fullPage: true });
    console.log('📸 Screenshot saved: 3-postcode-2000-results.png');
    
    const resultText2000 = await page.textContent('body');
    console.log('🔍 2000 Results found:', resultText2000.includes('No Current Declaration') ? 'No Current Declaration' : 'Contains disaster info');
    
    const foundDisasters2000 = disasterPatterns.filter(pattern => 
      resultText2000.toLowerCase().includes(pattern.toLowerCase())
    );
    
    console.log('🎯 Specific disasters found for 2000:', foundDisasters2000.length > 0 ? foundDisasters2000 : 'None');
    
    // 4. Test the Refresh Live Data button
    console.log('\n4. Testing Refresh Live Data button...');
    const refreshButton = await page.locator('button:has-text("Refresh"), button:has-text("Live Data")').first();
    
    if (await refreshButton.isVisible()) {
      console.log('✅ Refresh button found, clicking...');
      await refreshButton.click();
      await page.waitForTimeout(2000);
      
      // Check for errors
      const errorText = await page.textContent('body');
      if (errorText.includes('error') || errorText.includes('Error') || errorText.includes('failed')) {
        console.log('❌ Error detected after refresh:', errorText);
      } else {
        console.log('✅ Refresh completed without visible errors');
      }
      
      await page.screenshot({ path: './test-results/4-after-refresh.png', fullPage: true });
      console.log('📸 Screenshot saved: 4-after-refresh.png');
    } else {
      console.log('❌ Refresh button not found');
    }
    
    // 5. Check for data source indicators
    console.log('\n5. Checking data sources...');
    const bodyText = await page.textContent('body');
    const dataSourceIndicators = [
      'DisasterAssist',
      'Emergency Management',
      'Government',
      'Live data',
      'Real-time',
      'Official'
    ];
    
    const foundSources = dataSourceIndicators.filter(source => 
      bodyText.toLowerCase().includes(source.toLowerCase())
    );
    
    console.log('📊 Data source indicators found:', foundSources.length > 0 ? foundSources : 'None explicitly mentioned');
    
    // 6. Check if multiple disasters can be shown
    console.log('\n6. Looking for multiple disaster indicators...');
    const multipleDisasterIndicators = [
      'disasters',
      'multiple',
      'additional',
      'also affected',
      'other emergencies'
    ];
    
    const foundMultiple = multipleDisasterIndicators.filter(indicator => 
      bodyText.toLowerCase().includes(indicator.toLowerCase())
    );
    
    console.log('🔄 Multiple disaster indicators:', foundMultiple.length > 0 ? foundMultiple : 'None found');
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: './test-results/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testDisasterSpecifics();