#!/usr/bin/env node

/**
 * ACT DISASTER SCRAPER FOR RAILWAY DEPLOYMENT
 * Scrapes ACT disasters and updates database
 * Expected: 1 page, ~10 disasters
 * Note: ACT has no LGAs - whole territory affected
 */

import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3008;

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Exit if no credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('L ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

console.log('<Û ACT Disaster Scraper Service Starting...');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    state: 'ACT',
    service: 'Australian Capital Territory Disaster Scraper',
    lastRun: global.lastRun || 'Not yet run',
    lastDisasterCount: global.lastCount || 0,
    lastActiveCount: global.lastActive || 0
  });
});

// Manual trigger endpoint
app.get('/scrape', async (req, res) => {
  res.json({ message: 'ACT scraping started' });
  scrapeACT().catch(console.error);
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
async function scrapeACT() {
  console.log(`\n<Û Scraping ACT disasters at ${new Date().toISOString()}`);
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
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?state=act', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await page.waitForSelector('table', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`  Extracting disasters from table...`);
    
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
    
    // Process each disaster - ACT has no LGAs, whole territory affected
    for (const disaster of pageDisasters) {
      disaster.lgas = ['Australian Capital Territory'];
      disaster.isActive = isActive(disaster.endDate);
      allDisasters.push(disaster);
      
      const status = disaster.isActive ? ' ACTIVE' : 'L EXPIRED';
      console.log(`  ${disaster.agrn}: ${status} - ${disaster.name}`);
    }
    
  } finally {
    await browser.close();
  }
  
  // Save to database
  console.log(`\n  Found ${allDisasters.length} disasters`);
  const activeCount = allDisasters.filter(d => d.isActive).length;
  console.log(`  Active: ${activeCount}`);
  
  global.lastCount = allDisasters.length;
  global.lastActive = activeCount;
  
  // Clear existing ACT data
  await supabase
    .from('act_disasters')
    .delete()
    .neq('agrn', '');
  
  // Insert new data
  for (const disaster of allDisasters) {
    await supabase
      .from('act_disasters')
      .upsert({
        agrn: disaster.agrn,
        name: disaster.name,
        type: disaster.type,
        start_date: disaster.startDate,
        end_date: disaster.isActive ? null : disaster.endDate,
        is_active: disaster.isActive,
        affected_lgas: disaster.lgas || [],
        lga_count: 1, // Always 1 for ACT
        source_url: disaster.url,
        scraped_at: new Date().toISOString()
      });
  }
  
  // Update state summary for frontend tiles
  await supabase
    .from('state_disaster_summary')
    .upsert({
      state_code: 'ACT',
      total_disasters: allDisasters.length,
      active_disasters: activeCount,
      affected_lgas: ['Australian Capital Territory'],
      lga_count: 1,
      last_updated: new Date().toISOString()
    });
  
  console.log(` ACT scraping complete: ${allDisasters.length} disasters, ${activeCount} active, whole territory affected`);
}

// Schedule hourly scraping
cron.schedule('0 * * * *', () => {
  console.log('ð Running scheduled ACT scrape...');
  scrapeACT().catch(console.error);
});

// Start server
app.listen(PORT, () => {
  console.log(` ACT Scraper running on port ${PORT}`);
  console.log('Endpoints:');
  console.log(`  Health: http://localhost:${PORT}/`);
  console.log(`  Manual: http://localhost:${PORT}/scrape`);
  
  // Run initial scrape after 10 seconds
  setTimeout(() => {
    console.log('=€ Running initial ACT scrape...');
    scrapeACT().catch(console.error);
  }, 10000);
});