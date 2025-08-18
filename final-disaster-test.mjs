import { chromium } from 'playwright';

async function testDisasterDisplay() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing Final Disaster Data Display');
    console.log('=====================================');
    
    // Navigate to the site
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'final-initial-page.png', fullPage: true });
    console.log('✅ Initial page loaded and screenshot taken');
    
    // Test 1: Check Brisbane (4000)
    console.log('\n🏙️ Testing Brisbane postcode 4000');
    console.log('================================');
    
    // Find and fill postcode input
    const postcodeInput = page.locator('input[placeholder*="postcode"], input[placeholder*="4870"], input').first();
    await postcodeInput.clear();
    await postcodeInput.fill('4000');
    console.log('✅ Entered postcode 4000');
    
    // Click verify/check button
    const checkButton = page.locator('button:has-text("Verify"), button:has-text("Check")').first();
    await checkButton.click();
    console.log('✅ Clicked verification button');
    
    // Wait for results
    await page.waitForTimeout(5000);
    
    // Take screenshot of Brisbane results
    await page.screenshot({ path: 'final-brisbane-4000.png', fullPage: true });
    console.log('✅ Brisbane results screenshot taken');
    
    // Extract all text content
    const allTextContent = await page.textContent('body');
    
    // Look for disaster-related text
    const disasterKeywords = [
      'Brisbane River Flooding',
      'Brisbane River',
      'Brisbane flood',
      'Queensland flood',
      'disaster declaration',
      'emergency declaration',
      'DISASTER EXEMPTION',
      'Declaration Found',
      'Declaration Active'
    ];
    
    console.log('\n📋 BRISBANE (4000) DISASTER CONTENT ANALYSIS:');
    console.log('============================================');
    
    let foundDisasterText = false;
    disasterKeywords.forEach(keyword => {
      if (allTextContent.toLowerCase().includes(keyword.toLowerCase())) {
        console.log(`✅ FOUND: "${keyword}"`);
        foundDisasterText = true;
      } else {
        console.log(`❌ NOT FOUND: "${keyword}"`);
      }
    });
    
    // Test 2: Check Sydney (2000)
    console.log('\n🌉 Testing Sydney postcode 2000');
    console.log('==============================');
    
    // Navigate back to home if needed
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(2000);
    
    // Find and fill postcode input
    const postcodeInput2 = page.locator('input[placeholder*="postcode"], input[placeholder*="4870"], input').first();
    await postcodeInput2.clear();
    await postcodeInput2.fill('2000');
    console.log('✅ Entered postcode 2000');
    
    // Click verify/check button
    const checkButton2 = page.locator('button:has-text("Verify"), button:has-text("Check")').first();
    await checkButton2.click();
    console.log('✅ Clicked verification button');
    
    // Wait for results
    await page.waitForTimeout(5000);
    
    // Take screenshot of Sydney results
    await page.screenshot({ path: 'final-sydney-2000.png', fullPage: true });
    console.log('✅ Sydney results screenshot taken');
    
    // Extract Sydney text content
    const sydneyTextContent = await page.textContent('body');
    
    // Look for Sydney disaster-related text
    const sydneyKeywords = [
      'Sydney Harbour Flooding',
      'Sydney Harbour',
      'Sydney flood',
      'NSW flood',
      'disaster declaration',
      'emergency declaration',
      'DISASTER EXEMPTION',
      'Declaration Found',
      'Declaration Active'
    ];
    
    console.log('\n📋 SYDNEY (2000) DISASTER CONTENT ANALYSIS:');
    console.log('=========================================');
    
    let foundSydneyDisasterText = false;
    sydneyKeywords.forEach(keyword => {
      if (sydneyTextContent.toLowerCase().includes(keyword.toLowerCase())) {
        console.log(`✅ FOUND: "${keyword}"`);
        foundSydneyDisasterText = true;
      } else {
        console.log(`❌ NOT FOUND: "${keyword}"`);
      }
    });
    
    // Final Analysis
    console.log('\n🎯 FINAL ANALYSIS');
    console.log('================');
    console.log(`Brisbane specific disaster data found: ${foundDisasterText ? '✅ YES' : '❌ NO'}`);
    console.log(`Sydney specific disaster data found: ${foundSydneyDisasterText ? '✅ YES' : '❌ NO'}`);
    
    if (!foundDisasterText && !foundSydneyDisasterText) {
      console.log('\n⚠️  CRITICAL ISSUE: No specific disaster names are being displayed!');
      console.log('The system appears to be showing generic messages instead of real disaster data.');
    } else {
      console.log('\n✅ SUCCESS: Specific disaster data is being displayed correctly!');
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
}

testDisasterDisplay();