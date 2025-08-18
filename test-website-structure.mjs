#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🔍 Testing DisasterAssist website structure...\n');

async function testWebsite() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser to see what's happening
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    console.log('Loading DisasterAssist website...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for page to fully load
    await new Promise(r => setTimeout(r, 5000));
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      const info = {
        title: document.title,
        url: window.location.href,
        hasTable: !!document.querySelector('table'),
        hasTbody: !!document.querySelector('tbody'),
        tableCount: document.querySelectorAll('table').length,
        rowCount: document.querySelectorAll('tr').length,
        // Check for different possible selectors
        selectors: {
          'table': !!document.querySelector('table'),
          'table tbody': !!document.querySelector('table tbody'),
          'table tbody tr': !!document.querySelector('table tbody tr'),
          '.table': !!document.querySelector('.table'),
          '#results': !!document.querySelector('#results'),
          '.results': !!document.querySelector('.results'),
          '.disaster-list': !!document.querySelector('.disaster-list'),
          '[data-testid="disasters"]': !!document.querySelector('[data-testid="disasters"]')
        },
        // Get all classes and IDs that might contain disasters
        possibleContainers: []
      };
      
      // Find divs that might contain disaster listings
      const divs = document.querySelectorAll('div');
      divs.forEach(div => {
        const text = div.innerText || '';
        if (text.includes('AGRN') || text.includes('disaster') || text.includes('2025')) {
          const classes = div.className || 'no-class';
          const id = div.id || 'no-id';
          info.possibleContainers.push({
            classes,
            id,
            textPreview: text.substring(0, 100)
          });
        }
      });
      
      // Get the actual HTML structure
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        info.tableHTML = tables[0].outerHTML.substring(0, 500);
      }
      
      return info;
    });
    
    console.log('\nPage Analysis:');
    console.log(JSON.stringify(pageInfo, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'disaster-website-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: disaster-website-test.png');
    
    // Try to find disaster links another way
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks
        .filter(a => a.href.includes('/disasters/') || a.href.includes('AGRN'))
        .slice(0, 5)
        .map(a => ({
          text: a.innerText,
          href: a.href
        }));
    });
    
    console.log('\nSample disaster links found:');
    console.log(JSON.stringify(links, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nKeeping browser open for 30 seconds to inspect...');
    await new Promise(r => setTimeout(r, 30000));
    await browser.close();
  }
}

testWebsite().catch(console.error);