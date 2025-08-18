#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🔍 Testing DisasterAssist page structure...\n');

async function testPage() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    console.log('Loading page...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait a bit for any dynamic content
    await new Promise(r => setTimeout(r, 3000));
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      const info = {
        title: document.title,
        url: window.location.href,
        
        // Check for tables
        tables: document.querySelectorAll('table').length,
        tableRows: document.querySelectorAll('table tbody tr').length,
        
        // Check for any disaster links
        links: Array.from(document.querySelectorAll('a')).filter(a => 
          a.href.includes('/disasters/') || a.href.includes('AGRN')
        ).length,
        
        // Sample links
        sampleLinks: Array.from(document.querySelectorAll('a'))
          .filter(a => a.href.includes('/disasters/'))
          .slice(0, 5)
          .map(a => ({ text: a.innerText, href: a.href })),
        
        // Check for specific selectors
        hasTable: !!document.querySelector('table'),
        hasRows: !!document.querySelector('tbody tr'),
        
        // Get first few table rows if they exist
        firstRows: Array.from(document.querySelectorAll('table tbody tr')).slice(0, 3).map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return cells.map(c => c.innerText.trim());
        })
      };
      
      return info;
    });
    
    console.log('Page Info:', JSON.stringify(pageInfo, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'disasters-page-test.png' });
    console.log('\n📸 Screenshot saved: disasters-page-test.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nBrowser will close in 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();
  }
}

testPage().catch(console.error);