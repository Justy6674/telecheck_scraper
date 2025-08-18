/**
 * AUTONOMOUS DISASTER SCRAPER FOR RAILWAY
 * Runs 24/7 to scrape DisasterAssist for Medicare compliance
 */

import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// Get credentials from environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    message: 'Disaster scraper running',
    supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing'
  });
});

// Manual sync endpoint
app.post('/sync', async (req, res) => {
  const jobId = Date.now().toString();
  
  // Start async scraping
  scrapeDisasters(jobId).catch(console.error);
  
  res.json({ 
    success: true, 
    jobId,
    message: 'Sync started'
  });
});

// Daily sync endpoint (called by cron)
app.post('/daily-sync', async (req, res) => {
  console.log('Starting daily sync...');
  const jobId = `daily-${Date.now()}`;
  
  scrapeDisasters(jobId).catch(console.error);
  
  res.json({ 
    success: true,
    jobId,
    message: 'Daily sync initiated'
  });
});

async function scrapeDisasters(jobId) {
  console.log(`[${jobId}] Starting disaster scrape...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    const allDisasters = [];
    
    // Scrape all pages (up to 40)
    for (let pageNum = 0; pageNum <= 40; pageNum++) {
      const url = pageNum === 0 
        ? 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
        : `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page=${pageNum}`;
      
      console.log(`[${jobId}] Scraping page ${pageNum + 1}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract disasters from table
      const pageDisasters = await page.evaluate(() => {
        const results = [];
        const rows = document.querySelectorAll('table tbody tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            const startDate = cells[0]?.textContent?.trim() || '';
            const endDate = cells[1]?.textContent?.trim() || '';
            const state = cells[2]?.textContent?.trim() || '';
            const disasterType = cells[3]?.textContent?.trim() || '';
            const eventName = cells[4]?.textContent?.trim() || '';
            const agrn = cells[5]?.textContent?.trim() || '';
            const link = row.querySelector('a')?.href || '';
            
            if (agrn && eventName) {
              results.push({
                agrn: `AGRN-${agrn}`,
                eventName,
                startDate,
                endDate: endDate === '-' ? null : endDate,
                state,
                disasterType,
                detailUrl: link
              });
            }
          }
        });
        
        return results;
      });
      
      if (pageDisasters.length === 0 && pageNum > 35) break;
      
      allDisasters.push(...pageDisasters);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`[${jobId}] Found ${allDisasters.length} disasters`);
    
    // Save to database
    let saved = 0;
    for (const disaster of allDisasters) {
      try {
        // Parse dates
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr === '-') return null;
          const months = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const match = dateStr.match(/(\w+)\s+(\d{4})/);
          if (match) {
            const month = months[match[1]] || '01';
            return `${match[2]}-${month}-01`;
          }
          return null;
        };
        
        // Map state
        const stateMap = {
          'New South Wales': 'NSW',
          'Victoria': 'VIC',
          'Queensland': 'QLD',
          'South Australia': 'SA',
          'Western Australia': 'WA',
          'Tasmania': 'TAS',
          'Northern Territory': 'NT',
          'Australian Capital Territory': 'ACT',
          'Multi-state': 'NSW'
        };
        
        const stateCode = stateMap[disaster.state] || 'NSW';
        
        // Map disaster type
        const typeMap = {
          'Flood': 'flood',
          'Storm': 'severe_storm',
          'Flood, Storm': 'flood',
          'Bushfire': 'bushfire',
          'Cyclone': 'cyclone',
          'Earthquake': 'earthquake',
          'Drought': 'drought'
        };
        
        const disasterTypeEnum = typeMap[disaster.disasterType] || 'other';
        
        const { error } = await supabase
          .from('disaster_declarations')
          .upsert({
            agrn_reference: disaster.agrn,
            event_name: disaster.eventName,
            disaster_type: disasterTypeEnum,
            declaration_date: parseDate(disaster.startDate) || '2025-01-01',
            expiry_date: parseDate(disaster.endDate),
            declaration_status: disaster.endDate ? 'expired' : 'active',
            state_code: stateCode,
            lga_code: '31000', // Will be updated when we scrape details
            description: disaster.eventName,
            declaration_authority: 'Australian Government',
            verification_url: disaster.detailUrl,
            source_url: disaster.detailUrl,
            data_source: 'disasterassist.gov.au',
            source_system: 'DisasterAssist',
            last_sync_timestamp: new Date().toISOString()
          }, {
            onConflict: 'agrn_reference',
            ignoreDuplicates: false
          });
        
        if (!error) saved++;
        
      } catch (err) {
        console.error(`Error saving ${disaster.agrn}:`, err.message);
      }
    }
    
    console.log(`[${jobId}] Saved ${saved} disasters to database`);
    
    // Log sync
    await supabase
      .from('data_import_logs')
      .insert({
        import_type: 'railway_disaster_sync',
        source_url: 'https://www.disasterassist.gov.au',
        records_imported: saved,
        import_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          job_id: jobId,
          total_found: allDisasters.length,
          saved: saved
        }
      });
    
  } catch (error) {
    console.error(`[${jobId}] Scrape failed:`, error);
  } finally {
    await browser.close();
  }
}

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Disaster Scraper running on port ${PORT}`);
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  
  // Run initial sync on startup
  if (process.env.RUN_ON_STARTUP === 'true') {
    console.log('Running initial sync...');
    scrapeDisasters('startup').catch(console.error);
  }
});