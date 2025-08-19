#!/usr/bin/env node

/**
 * QUEENSLAND DISASTER SCRAPER FOR RAILWAY DEPLOYMENT
 * Scrapes QLD disasters and updates database
 * Expected: 8 pages, ~160 disasters
 */

import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3003;

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Exit if no credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

console.log('🏝️ QLD Disaster Scraper Service Starting...');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    state: 'QLD',
    service: 'Queensland Disaster Scraper',
    lastRun: global.lastRun || 'Not yet run',
    lastDisasterCount: global.lastCount || 0,
    lastActiveCount: global.lastActive || 0
  });
});

// Manual trigger endpoint
app.get('/scrape', async (req, res) => {
  res.json({ message: 'QLD scraping started' });
  scrapeQLD().catch(console.error);
});

// Check if disaster is active
function isActive(endDate) {
  if (!endDate) return true;
  const normalized = endDate.trim();
  return normalized === '' || 
         normalized === '-' || 
         normalized === '--' || 
         normalized === '- -';
}

// Main scraping function
async function scrapeQLD() {
  console.log(`\n🏝️ Scraping QLD disasters at ${new Date().toISOString()}`);
  global.lastRun = new Date().toISOString();
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  const allDisasters = [];
  
  try {
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?state=qld', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await page.waitForSelector('table', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let currentPage = 1;
    const maxPages = 12;
    
    while (currentPage <= maxPages) {
      console.log(`  Page ${currentPage}...`);
      
      // Extract disasters from table
      const pageDisasters = await page.evaluate(() => {
        const disasters = [];
        const rows = document.querySelectorAll('table tbody tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const link = row.querySelector('a[href*="/disasters/"]');
            if (link) {
              // Get AGRN from last column
              let agrn = '';
              if (cells.length > 5) {
                const lastCell = cells[cells.length - 1]?.textContent?.trim();
                if (/^\d{3,4}$/.test(lastCell)) {
                  agrn = `AGRN-${lastCell}`;
                }
              }
              
              disasters.push({
                agrn: agrn,
                name: cells[4]?.textContent?.trim(),
                startDate: cells[0]?.textContent?.trim(),
                endDate: cells[1]?.textContent?.trim(),
                state: cells[2]?.textContent?.trim(),
                type: cells[3]?.textContent?.trim(),
                url: link.href
              });
            }
          }
        });
        
        return disasters;
      });
      
      // Get LGAs for each disaster
      for (const disaster of pageDisasters) {
        try {
          const detailPage = await browser.newPage();
          await detailPage.goto(disaster.url, { waitUntil: 'networkidle2' });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const lgas = await detailPage.evaluate(() => {
            const lgaList = [];
            const selectors = [
              '.field-name-field-lgas li',
              '.affected-areas li',
              '.field-items li'
            ];
            
            for (const selector of selectors) {
              const items = document.querySelectorAll(selector);
              if (items.length > 0) {
                items.forEach(item => {
                  const text = item.textContent?.trim();
                  if (text && text.length > 2 && text.length < 100) {
                    lgaList.push(text);
                  }
                });
                break;
              }
            }
            
            return [...new Set(lgaList)];
          });
          
          disaster.lgas = lgas;
          disaster.isActive = isActive(disaster.endDate);
          
          await detailPage.close();
        } catch (error) {
          console.error(`    Error getting LGAs for ${disaster.agrn}: ${error.message}`);
          disaster.lgas = [];
          disaster.isActive = isActive(disaster.endDate);
        }
        
        allDisasters.push(disaster);
      }
      
      // Check for next page
      const hasNext = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          if (link.textContent?.includes('Next')) {
            return !link.disabled;
          }
        }
        return false;
      });
      
      if (!hasNext || pageDisasters.length === 0) break;
      
      // Click next
      await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          if (link.textContent?.includes('Next')) {
            link.click();
            break;
          }
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      currentPage++;
    }
    
  } finally {
    await browser.close();
  }
  
  // Save to database
  console.log(`  Found ${allDisasters.length} disasters`);
  const activeCount = allDisasters.filter(d => d.isActive).length;
  console.log(`  Active: ${activeCount}`);
  
  global.lastCount = allDisasters.length;
  global.lastActive = activeCount;
  
  // Clear existing QLD data
  await supabase
    .from('qld_disasters')
    .delete()
    .neq('agrn', '');
  
  // Insert new data
  for (const disaster of allDisasters) {
    await supabase
      .from('qld_disasters')
      .upsert({
        agrn: disaster.agrn,
        name: disaster.name,
        type: disaster.type,
        start_date: disaster.startDate,
        end_date: disaster.isActive ? null : disaster.endDate,
        is_active: disaster.isActive,
        affected_lgas: disaster.lgas || [],
        lga_count: disaster.lgas?.length || 0,
        source_url: disaster.url,
        scraped_at: new Date().toISOString()
      });
  }
  
  // Update state summary for frontend tiles
  const uniqueLGAs = [...new Set(allDisasters.filter(d => d.isActive).flatMap(d => d.lgas || []))];
  
  await supabase
    .from('state_disaster_summary')
    .upsert({
      state_code: 'QLD',
      total_disasters: allDisasters.length,
      active_disasters: activeCount,
      affected_lgas: uniqueLGAs,
      lga_count: uniqueLGAs.length,
      last_updated: new Date().toISOString()
    });
  
  console.log(`✅ QLD scraping complete: ${allDisasters.length} disasters, ${activeCount} active, ${uniqueLGAs.length} LGAs affected`);
}

// Schedule hourly scraping
cron.schedule('0 2 * * 0', () => {
  console.log('⏰ Running scheduled QLD scrape...');
  scrapeQLD().catch(console.error);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ QLD Scraper running on port ${PORT}`);
  console.log('Endpoints:');
  console.log(`  Health: http://localhost:${PORT}/`);
  console.log(`  Manual: http://localhost:${PORT}/scrape`);
  
  // Run initial scrape after 10 seconds
  setTimeout(() => {
    console.log('🚀 Running initial QLD scrape...');
    scrapeQLD().catch(console.error);
  }, 10000);
});
