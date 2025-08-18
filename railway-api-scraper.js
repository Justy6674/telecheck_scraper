#!/usr/bin/env node

/**
 * RAILWAY API SCRAPER - Simpler approach
 * Uses fetch instead of Puppeteer for better reliability
 */

import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
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

console.log('🚀 Railway API Scraper Service starting...');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'API Scraper (no browser needed)',
    lastRun: global.lastRun || 'Not yet run',
    lastCount: global.lastCount || 0
  });
});

// Manual trigger endpoint
app.get('/scrape', async (req, res) => {
  res.json({ message: 'API scraping started' });
  scrapeWithFetch().catch(console.error);
});

// Main scraping function using fetch
async function scrapeWithFetch() {
  console.log('Starting API-based scrape...');
  global.lastRun = new Date().toISOString();
  
  try {
    // Fetch the page HTML directly
    console.log('Fetching disasters page...');
    const response = await fetch('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`Received ${html.length} bytes of HTML`);
    
    // Parse with cheerio
    const $ = cheerio.load(html);
    
    // Find all disaster links
    const disasters = [];
    $('a[href*="/disasters/"]').each((i, elem) => {
      const $link = $(elem);
      const $row = $link.closest('tr');
      
      if ($row.length) {
        const $cells = $row.find('td');
        if ($cells.length >= 5) {
          const endDate = $cells.eq(1).text().trim();
          const isActive = !endDate || endDate === '-' || endDate === '–' || endDate === '- -' || endDate === '--';
          
          disasters.push({
            url: 'https://www.disasterassist.gov.au' + $link.attr('href'),
            start_date: $cells.eq(0).text().trim(),
            end_date: endDate,
            state: $cells.eq(2).text().trim(),
            type: $cells.eq(3).text().trim(),
            name: $cells.eq(4).text().trim() || $link.text().trim(),
            is_active: isActive
          });
        }
      }
    });
    
    console.log(`Found ${disasters.length} disasters`);
    global.lastCount = disasters.length;
    
    // If no disasters found, try alternative parsing
    if (disasters.length === 0) {
      console.log('No disasters found with standard parsing, checking for table...');
      const tableExists = $('table').length > 0;
      const rowCount = $('tr').length;
      const linkCount = $('a').length;
      console.log(`Debug: table=${tableExists}, rows=${rowCount}, links=${linkCount}`);
      
      // Try more aggressive parsing
      $('tr').each((i, row) => {
        const $row = $(row);
        const $cells = $row.find('td');
        if ($cells.length >= 5) {
          const text = $row.text();
          if (text.includes('2024') || text.includes('2025')) {
            console.log(`Row ${i}: ${text.substring(0, 100)}`);
          }
        }
      });
    }
    
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
        scraper_version: 'railway-api-v1',
        total_disasters_found: disasters.length,
        active_disasters_found: disasters.filter(d => d.is_active).length,
        state_counts: stateCounts,
        scrape_type: 'manual',
        validation_passed: disasters.length > 0
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
  console.log('🌐 Using fetch API (no browser needed)');
  
  // Run initial scrape after 5 seconds
  setTimeout(() => {
    console.log('Running initial scrape...');
    scrapeWithFetch().catch(console.error);
  }, 5000);
});