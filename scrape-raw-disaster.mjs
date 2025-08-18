#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🔍 GENERAL SCRAPE - Extract EVERYTHING from a disaster page\n');

async function scrapeRawDisaster() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    // Go directly to Cyclone Alfred page
    const url = 'https://www.disasterassist.gov.au/Pages/disasters/queensland/tropical-cyclone-alfred-march-2025.aspx';
    console.log('📄 Loading:', url);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Extract EVERYTHING
    const everything = await page.evaluate(() => {
      const data = {
        url: window.location.href,
        title: document.title,
        h1: document.querySelector('h1')?.innerText,
        
        // Get ALL text content
        fullText: document.body.innerText,
        
        // Get all headings
        allHeadings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          level: h.tagName,
          text: h.innerText.trim()
        })),
        
        // Get all lists
        allLists: Array.from(document.querySelectorAll('ul, ol')).map(list => ({
          type: list.tagName,
          items: Array.from(list.querySelectorAll('li')).map(li => li.innerText.trim())
        })),
        
        // Get all definition lists (dt/dd pairs)
        definitionLists: Array.from(document.querySelectorAll('dl')).map(dl => {
          const pairs = {};
          const dts = dl.querySelectorAll('dt');
          const dds = dl.querySelectorAll('dd');
          for (let i = 0; i < dts.length; i++) {
            pairs[dts[i]?.innerText?.trim()] = dds[i]?.innerText?.trim();
          }
          return pairs;
        }),
        
        // Get all paragraphs
        allParagraphs: Array.from(document.querySelectorAll('p')).map(p => p.innerText.trim()).filter(t => t.length > 10),
        
        // Get all links
        allLinks: Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.innerText.trim(),
          href: a.href
        })).filter(l => l.text && !l.href.includes('javascript')),
        
        // Get all text that contains numbers (might be LGA counts)
        textWithNumbers: Array.from(document.querySelectorAll('*')).map(el => el.innerText).filter(t => t && /\d+/.test(t) && t.includes('local government')),
        
        // Find any text containing "local government area"
        lgaTexts: Array.from(document.querySelectorAll('*')).map(el => el.innerText).filter(t => t && t.toLowerCase().includes('local government area')),
        
        // Get the HTML structure
        htmlStructure: document.querySelector('main')?.innerHTML || document.querySelector('.content')?.innerHTML || document.body.innerHTML.substring(0, 5000)
      };
      
      return data;
    });
    
    console.log('=' .repeat(80));
    console.log('📊 RAW DATA EXTRACTED:');
    console.log('=' .repeat(80));
    
    console.log('\n📌 BASIC INFO:');
    console.log('URL:', everything.url);
    console.log('Title:', everything.title);
    console.log('H1:', everything.h1);
    
    console.log('\n📑 HEADINGS FOUND:', everything.allHeadings.length);
    everything.allHeadings.forEach(h => {
      console.log(`  ${h.level}: ${h.text}`);
    });
    
    console.log('\n📋 LISTS FOUND:', everything.allLists.length);
    everything.allLists.forEach((list, i) => {
      console.log(`\n  List ${i + 1} (${list.type}) - ${list.items.length} items:`);
      list.items.slice(0, 5).forEach(item => {
        console.log(`    • ${item.substring(0, 100)}...`);
      });
      if (list.items.length > 5) {
        console.log(`    ... and ${list.items.length - 5} more items`);
      }
    });
    
    console.log('\n📖 DEFINITION LISTS:', everything.definitionLists.length);
    everything.definitionLists.forEach(dl => {
      Object.entries(dl).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
    
    console.log('\n🔢 TEXT WITH "LOCAL GOVERNMENT AREA":', everything.lgaTexts.length, 'occurrences');
    everything.lgaTexts.slice(0, 3).forEach(text => {
      console.log('\n  ---');
      console.log('  ' + text.substring(0, 500));
    });
    
    console.log('\n📝 PARAGRAPHS:', everything.allParagraphs.length);
    console.log('First few paragraphs:');
    everything.allParagraphs.slice(0, 3).forEach(p => {
      console.log('\n  ' + p.substring(0, 200) + '...');
    });
    
    console.log('\n🔗 LINKS FOUND:', everything.allLinks.length);
    everything.allLinks.slice(0, 10).forEach(link => {
      console.log(`  ${link.text}: ${link.href}`);
    });
    
    // Save full text to file for analysis
    const fs = await import('fs');
    fs.writeFileSync('disaster-full-text.txt', everything.fullText);
    console.log('\n💾 Full text saved to: disaster-full-text.txt');
    
    fs.writeFileSync('disaster-html-structure.html', everything.htmlStructure);
    console.log('💾 HTML structure saved to: disaster-html-structure.html');
    
    // Save everything as JSON
    fs.writeFileSync('disaster-everything.json', JSON.stringify(everything, null, 2));
    console.log('💾 Complete data saved to: disaster-everything.json');
    
    // Take screenshot
    await page.screenshot({ path: 'disaster-general-scrape.png', fullPage: true });
    console.log('📸 Screenshot saved: disaster-general-scrape.png');
    
    console.log('\n' + '=' .repeat(80));
    console.log('✅ GENERAL SCRAPE COMPLETE');
    console.log('Check the saved files to see ALL the data available on the page');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\nBrowser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

// Run it
scrapeRawDisaster().catch(console.error);