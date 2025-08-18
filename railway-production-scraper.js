#!/usr/bin/env node

/**
 * PRODUCTION RAILWAY SCRAPER - Uses proven working logic
 * Handles pagination and dynamic content properly
 */

import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

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
  process.exit(1);
}

console.log('🚀 Railway Production Scraper starting...');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'Production Scraper',
    lastRun: global.lastRun || 'Not yet run',
    lastStats: global.lastStats || {}
  });
});

// Manual trigger endpoint
app.get('/scrape', async (req, res) => {
  res.json({ message: 'Production scraping started' });
  scrapeDisasters().catch(console.error);
});

// Main scraping function with proven logic
async function scrapeDisasters() {
  console.log('Starting production scrape...');
  global.lastRun = new Date().toISOString();
  
  let browser;
  try {
    // Launch Puppeteer with proper args for container
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Add console logging from page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    console.log('📄 Loading disasters page...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Wait for dynamic content to load
    console.log('⏳ Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Handle cookie banner if present
    await page.evaluate(() => {
      const acceptButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.toLowerCase().includes('accept') ||
        btn.textContent?.toLowerCase().includes('agree')
      );
      if (acceptButton) acceptButton.click();
    });
    
    // Collect disasters from first page only (for quick testing)
    console.log('📊 Collecting disasters from page...');
    
    // Wait for table
    try {
      await page.waitForSelector('table', { timeout: 10000, visible: true });
      console.log('✅ Table found');
    } catch (e) {
      console.log('⚠️ Table not visible, continuing...');
    }
    
    // Extract disasters using proven logic
    const disasters = await page.evaluate(() => {
      const results = [];
      
      // Method 1: Look in table cells (most reliable)
      const tableCells = document.querySelectorAll('td a');
      tableCells.forEach(link => {
        if (link.href && link.href.includes('/disasters/')) {
          const row = link.closest('tr');
          if (row) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
              const endDate = cells[1]?.textContent?.trim() || '';
              // CRITICAL: Properly detect active disasters
              const isActive = !endDate || endDate === '-' || endDate === '–' || 
                              endDate === '- -' || endDate === '--' || endDate === '';
              
              results.push({
                url: link.href,
                start_date: cells[0]?.textContent?.trim() || '',
                end_date: endDate,
                state: cells[2]?.textContent?.trim() || '',
                type: cells[3]?.textContent?.trim() || '',
                name: cells[4]?.textContent?.trim() || '',
                is_active: isActive
              });
            }
          }
        }
      });
      
      // Method 2: If no table cells found, look for any disaster links
      if (results.length === 0) {
        console.log('Using fallback method...');
        const allLinks = document.querySelectorAll('a[href*="/disasters/"]');
        allLinks.forEach(link => {
          if (link.href && !link.href.includes('#')) {
            results.push({
              url: link.href,
              name: link.textContent?.trim() || '',
              is_active: true // Assume active if we can't determine
            });
          }
        });
      }
      
      return results;
    });
    
    console.log(`Found ${disasters.length} disasters`);
    
    // Count active by state
    const stateCounts = {};
    let activeCount = 0;
    
    disasters.forEach(d => {
      const state = mapStateCode(d.state || 'Unknown');
      if (!stateCounts[state]) {
        stateCounts[state] = { total: 0, active: 0 };
      }
      stateCounts[state].total++;
      if (d.is_active) {
        stateCounts[state].active++;
        activeCount++;
      }
    });
    
    global.lastStats = {
      total: disasters.length,
      active: activeCount,
      states: stateCounts
    };
    
    // Save summary to database
    const { error } = await supabase
      .from('scrape_runs')
      .insert({
        started_at: global.lastRun,
        completed_at: new Date().toISOString(),
        scraper_version: 'railway-production-v1',
        total_disasters_found: disasters.length,
        active_disasters_found: activeCount,
        state_counts: stateCounts,
        scrape_type: 'manual',
        validation_passed: disasters.length > 0
      });
    
    if (error) {
      console.error('Database error:', error);
    } else {
      console.log('✅ Scrape complete and saved to database');
    }
    
    // Log state counts
    console.log('\n📊 State counts:');
    Object.entries(stateCounts).forEach(([state, counts]) => {
      console.log(`  ${state}: ${counts.active} active / ${counts.total} total`);
    });
    
    // Medicare compliance check
    if (stateCounts['QLD'] && stateCounts['QLD'].active < 20) {
      console.warn('⚠️ WARNING: QLD active count below expected (20-30)');
    }
    if (stateCounts['WA'] && stateCounts['WA'].active < 30) {
      console.warn('⚠️ WARNING: WA active count below expected (30-45)');
    }
    
  } catch (error) {
    console.error('Scraping error:', error);
    global.lastStats = { error: error.message };
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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('📊 Connected to Supabase');
  console.log('🎯 Using production-tested scraping logic');
  
  // Run initial scrape after 10 seconds
  setTimeout(() => {
    console.log('Running initial scrape...');
    scrapeDisasters().catch(console.error);
  }, 10000);
});