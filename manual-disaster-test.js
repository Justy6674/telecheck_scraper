import { chromium } from 'playwright';

async function testDisasterData() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('1. Navigating to localhost:8080...');
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-page.png', fullPage: true });
    console.log('Initial page screenshot taken');
    
    // Test 1: Brisbane (4000)
    console.log('\n2. Testing Brisbane postcode 4000...');
    const postcodeInput = page.locator('input[placeholder*="postcode"], input[placeholder*="4000"], input[type="text"]').first();
    await postcodeInput.fill('4000');
    
    const quickCheckButton = page.locator('button:has-text("Quick Check"), button:has-text("Check")').first();
    await quickCheckButton.click();
    await page.waitForTimeout(5000);
    
    // Take screenshot of Brisbane results
    await page.screenshot({ path: 'brisbane-4000-results.png', fullPage: true });
    console.log('Brisbane results screenshot taken');
    
    // Get disaster text for Brisbane
    const brisbaneDisasterText = await page.locator('[class*="disaster"], [class*="emergency"], .card, .result').allTextContents();
    console.log('BRISBANE DISASTER TEXT:');
    brisbaneDisasterText.forEach(text => console.log('-', text.trim()));
    
    // Check for specific Brisbane disaster names
    const pageContent = await page.content();
    const hasBrisbaneRiverFlooding = pageContent.includes('Brisbane River Flooding') || pageContent.includes('Brisbane River');
    console.log('Contains "Brisbane River Flooding":', hasBrisbaneRiverFlooding);
    
    // Test 2: Sydney (2000)
    console.log('\n3. Testing Sydney postcode 2000...');
    await postcodeInput.fill('2000');
    await quickCheckButton.click();
    await page.waitForTimeout(5000);
    
    // Take screenshot of Sydney results
    await page.screenshot({ path: 'sydney-2000-results.png', fullPage: true });
    console.log('Sydney results screenshot taken');
    
    // Get disaster text for Sydney
    const sydneyDisasterText = await page.locator('[class*="disaster"], [class*="emergency"], .card, .result').allTextContents();
    console.log('SYDNEY DISASTER TEXT:');
    sydneyDisasterText.forEach(text => console.log('-', text.trim()));
    
    // Check for specific Sydney disaster names
    const sydneyPageContent = await page.content();
    const hasSydneyHarbourFlooding = sydneyPageContent.includes('Sydney Harbour Flooding') || sydneyPageContent.includes('Sydney Harbour');
    console.log('Contains "Sydney Harbour Flooding":', hasSydneyHarbourFlooding);
    
    // Get all visible text on page for complete analysis
    console.log('\n4. COMPLETE PAGE TEXT ANALYSIS:');
    const allText = await page.locator('body').textContent();
    const lines = allText.split('\n').filter(line => line.trim().length > 0);
    console.log('All visible text lines:');
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes('disaster') || 
          line.toLowerCase().includes('flood') || 
          line.toLowerCase().includes('emergency') ||
          line.toLowerCase().includes('brisbane') ||
          line.toLowerCase().includes('sydney')) {
        console.log(`${index}: ${line.trim()}`);
      }
    });
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
  }
}

testDisasterData();