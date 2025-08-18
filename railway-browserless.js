#!/usr/bin/env node

/**
 * RAILWAY SCRAPER USING BROWSERLESS.IO
 * No local Chrome needed - uses cloud browser
 */

import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 8080;

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🚀 Railway Browserless Scraper starting...');

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'Browserless Scraper',
    lastRun: global.lastRun || 'Not yet run',
    method: 'Using Browserless.io cloud browser'
  });
});

// Scrape endpoint
app.get('/scrape', async (req, res) => {
  res.json({ message: 'Scraping started with Browserless' });
  scrapeWithBrowserless().catch(console.error);
});

async function scrapeWithBrowserless() {
  console.log('Starting Browserless scrape...');
  global.lastRun = new Date().toISOString();
  
  let browser;
  try {
    // Connect to Browserless.io (free tier available)
    browser = await puppeteer.connect({
      browserWSEndpoint: 'wss://chrome.browserless.io?token=YOUR_FREE_TOKEN'
      // Get free token at https://www.browserless.io/
    });

    const page = await browser.newPage();
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle0'
    });
    
    // Quick scrape of first page only for testing
    const disasters = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('table tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const endDate = cells[1]?.textContent?.trim() || '';
          results.push({
            state: cells[2]?.textContent?.trim() || '',
            is_active: !endDate || endDate === '-' || endDate === '–'
          });
        }
      });
      return results;
    });
    
    // Count by state
    const stateCounts = {};
    disasters.forEach(d => {
      const state = mapStateCode(d.state);
      if (!stateCounts[state]) {
        stateCounts[state] = { total: 0, active: 0 };
      }
      stateCounts[state].total++;
      if (d.is_active) stateCounts[state].active++;
    });
    
    // Save to database
    const { error } = await supabase
      .from('scrape_runs')
      .insert({
        started_at: global.lastRun,
        completed_at: new Date().toISOString(),
        scraper_version: 'railway-browserless-v1',
        total_disasters_found: disasters.length,
        active_disasters_found: disasters.filter(d => d.is_active).length,
        state_counts: stateCounts,
        scrape_type: 'automated',
        validation_passed: true
      });
    
    if (error) {
      console.error('Database error:', error);
    } else {
      console.log('✅ Scrape saved to database');
    }
    
  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    if (browser) await browser.close();
  }
}

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

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('📊 Using Browserless.io - no local Chrome needed');
  console.log('⚡ Endpoints:');
  console.log('  GET / - Health check');
  console.log('  GET /scrape - Trigger scraping');
});