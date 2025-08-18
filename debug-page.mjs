import { chromium } from 'playwright';

async function debugPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Debugging page structure...');
    
    // Navigate to the application
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait a bit for React to load
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: '/Users/jb-downscale/Downloads/disaster-check-au/debug-initial.png', fullPage: true });
    console.log('📸 Initial screenshot saved as debug-initial.png');
    
    // Check what elements are available
    const elements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
        type: el.type,
        id: el.id,
        placeholder: el.placeholder,
        className: el.className
      }));
      
      const buttons = Array.from(document.querySelectorAll('button')).map(el => ({
        text: el.textContent?.trim(),
        className: el.className
      }));
      
      return { inputs, buttons };
    });
    
    console.log('📝 Found inputs:', JSON.stringify(elements.inputs, null, 2));
    console.log('📝 Found buttons:', JSON.stringify(elements.buttons, null, 2));
    
    // Get page title and basic content
    const title = await page.title();
    const bodyText = await page.textContent('body');
    
    console.log('📄 Page title:', title);
    console.log('📄 Body text preview:', bodyText?.slice(0, 500));
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
}

debugPage().catch(console.error);