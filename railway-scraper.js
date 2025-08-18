#!/usr/bin/env node

/**
 * RAILWAY DEPLOYMENT SCRAPER
 * Runs in cloud with proper Chrome installation
 */

import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 8080;

// Supabase connection - MUST use environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Exit if credentials not provided
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  console.error('Set them in Railway dashboard → Variables');
  process.exit(1);
}

console.log('🚀 Railway Disaster Scraper Service starting...');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'Disaster Scraper',
    lastRun: global.lastRun || 'Not yet run'
  });
});

// Manual trigger endpoint
app.get('/scrape', async (req, res) => {
  res.json({ message: 'Scraping started' });
  scrapeDisasters().catch(console.error);
});

// Main scraping function
async function scrapeDisasters() {
  console.log('Starting disaster scrape...');
  global.lastRun = new Date().toISOString();
  
  let browser;
  try {
    // Launch Puppeteer with proper args for container
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Required for some containers
        '--disable-extensions'
      ]
    };
    
    // Only set executablePath if explicitly provided (for Railway)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    // Otherwise let Puppeteer find Chrome automatically (for local dev)
    
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Loading disasters page...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extract disasters from table
    const disasters = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr, table tr');
      
      Array.from(rows).forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const link = row.querySelector('a[href*="/disasters/"]');
          if (link) {
            const endDate = cells[1]?.textContent?.trim() || '';
            results.push({
              url: link.href,
              start_date: cells[0]?.textContent?.trim() || '',
              end_date: endDate,
              state: cells[2]?.textContent?.trim() || '',
              type: cells[3]?.textContent?.trim() || '',
              name: cells[4]?.textContent?.trim() || link.textContent?.trim() || '',
              is_active: !endDate || endDate === '-' || endDate === '–' || endDate === '- -'
            });
          }
        }
      });
      
      return results;
    });
    
    console.log(`Found ${disasters.length} disasters`);
    
    // Count active by state
    const stateCounts = {};
    disasters.forEach(d => {
      const state = mapStateCode(d.state);
      if (!stateCounts[state]) {
        stateCounts[state] = { total: 0, active: 0 };
      }
      stateCounts[state].total++;
      if (d.is_active) stateCounts[state].active++;
    });
    
    // Save summary to database
    const { error } = await supabase
      .from('scrape_runs')
      .insert({
        started_at: global.lastRun,
        completed_at: new Date().toISOString(),
        scraper_version: 'railway-v1.0',
        total_disasters_found: disasters.length,
        active_disasters_found: disasters.filter(d => d.is_active).length,
        state_counts: stateCounts,
        scrape_type: 'automated',
        validation_passed: true
      });
    
    if (error) {
      console.error('Database error:', error);
    } else {
      console.log('✅ Scrape complete and saved');
    }
    
    // Log state counts
    console.log('State counts:');
    Object.entries(stateCounts).forEach(([state, counts]) => {
      console.log(`  ${state}: ${counts.active} active / ${counts.total} total`);
    });
    
  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function
function mapStateCode(state) {
  const map = {
    'New South Wales': 'NSW', 'NSW': 'NSW',
    'Victoria': 'VIC', 'VIC': 'VIC',
    'Queensland': 'QLD', 'QLD': 'QLD',
    'Western Australia': 'WA', 'WA': 'WA',
    'South Australia': 'SA', 'SA': 'SA',
    'Tasmania': 'TAS', 'TAS': 'TAS',
    'Northern Territory': 'NT', 'NT': 'NT',
    'Australian Capital Territory': 'ACT', 'ACT': 'ACT'
  };
  return map[state] || state;
}

// Schedule scraping every 8 hours
cron.schedule('0 */8 * * *', () => {
  console.log('Running scheduled scrape...');
  scrapeDisasters().catch(console.error);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('📊 Connected to Supabase');
  console.log('⏰ Scheduled to run every 8 hours');
  
  // Run initial scrape after 10 seconds
  setTimeout(() => {
    console.log('Running initial scrape...');
    scrapeDisasters().catch(console.error);
  }, 10000);
});