/**
 * AUTONOMOUS PUPPETEER SCRAPER WORKER
 * Deploy this to Render.com, Railway.app, or DigitalOcean App Platform
 * This runs independently and is called by Supabase Edge Functions
 */

import express from 'express';
import { Cluster } from 'puppeteer-cluster';
import { v4 as uuidv4 } from 'uuid';
import pRetry from 'p-retry';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Supabase client for direct database writes
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory job store (replace with Redis in production)
const JOBS = new Map();

// Initialize Puppeteer cluster
const cluster = await Cluster.launch({
  concurrency: Cluster.CONCURRENCY_CONTEXT,
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '2', 10),
  puppeteerOptions: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials'
    ]
  },
  timeout: 120000,
  retryLimit: 2,
  retryDelay: 1000
});

// Main scraping task
await cluster.task(async ({ page, data }) => {
  const { jobId, action } = data;
  
  try {
    if (action === 'scrape_disaster_list') {
      // Scrape the main listing pages
      const disasters = [];
      
      for (let pageNum = 0; pageNum <= 45; pageNum++) {
        const url = pageNum === 0 
          ? 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
          : `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page=${pageNum}`;
        
        console.log(`[${jobId}] Scraping page ${pageNum + 1}: ${url}`);
        
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract disaster links and basic info
        const pageData = await page.evaluate(() => {
          const results = [];
          
          // Try multiple selectors
          const rows = document.querySelectorAll('table tbody tr, .disaster-item, .result-item');
          
          rows.forEach(row => {
            const link = row.querySelector('a[href*="disaster"], a[href*="agrn"]');
            if (link) {
              const cells = row.querySelectorAll('td');
              results.push({
                url: link.href,
                agrn: cells[0]?.textContent?.trim() || '',
                eventName: cells[1]?.textContent?.trim() || link.textContent?.trim() || '',
                dates: cells[2]?.textContent?.trim() || '',
                lgas: cells[3]?.textContent?.trim() || '',
                state: cells[4]?.textContent?.trim() || ''
              });
            }
          });
          
          return results;
        });
        
        disasters.push(...pageData);
        
        if (pageData.length === 0 && pageNum > 38) {
          console.log(`[${jobId}] No more disasters found, stopping at page ${pageNum}`);
          break;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return disasters;
    }
    
    if (action === 'scrape_disaster_details') {
      // Scrape individual disaster page for full details
      const { url } = data;
      
      console.log(`[${jobId}] Scraping details from: ${url}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract comprehensive details
      const details = await page.evaluate(() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };
        
        // Extract Quick Info table
        const quickInfo = {};
        const infoRows = document.querySelectorAll('.quick-info tr, table tr');
        infoRows.forEach(row => {
          const label = row.querySelector('td:first-child, th')?.textContent?.trim();
          const value = row.querySelector('td:last-child')?.textContent?.trim();
          if (label && value) {
            quickInfo[label.toLowerCase().replace(/[^a-z]/g, '_')] = value;
          }
        });
        
        // Extract main content
        const mainContent = document.querySelector('main, .content, article')?.textContent?.trim() || '';
        
        // Extract AGRN
        const agrnMatch = mainContent.match(/AGRN[:\s]*(\d+(?:,\d+)?)/i);
        const agrn = agrnMatch ? agrnMatch[1].replace(',', '') : null;
        
        // Extract dates
        const startDateMatch = mainContent.match(/Start Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        const endDateMatch = mainContent.match(/End Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        
        // Extract LGAs - CRITICAL FOR MEDICARE
        const lgaSection = mainContent.match(/local government area(?:s)?\s*\n+([\s\S]*?)(?:\n\n|$)/i);
        let lgas = [];
        
        if (lgaSection) {
          const lgaText = lgaSection[1];
          lgas = lgaText.split(/[\n,]/)
            .map(lga => lga.trim())
            .filter(lga => lga && lga.length > 2 && !lga.includes('following'));
        }
        
        // Also check for LGA lists in specific elements
        const lgaElements = document.querySelectorAll('.lga-list li, ul li, td');
        lgaElements.forEach(el => {
          const text = el.textContent.trim();
          if (text && !text.includes('following') && !text.includes('assistance')) {
            lgas.push(text);
          }
        });
        
        // Deduplicate LGAs
        lgas = [...new Set(lgas)];
        
        // Extract assistance types
        const assistanceSection = mainContent.match(/assistance.*?include[s]?:([\s\S]*?)(?:For information|For further|$)/i);
        let assistanceTypes = [];
        if (assistanceSection) {
          assistanceTypes = assistanceSection[1]
            .split(/[•\n]/)
            .map(a => a.trim())
            .filter(a => a && a.length > 5);
        }
        
        return {
          quickInfo,
          agrn,
          startDate: startDateMatch ? startDateMatch[1] : quickInfo.start_date,
          endDate: endDateMatch ? endDateMatch[1] : quickInfo.end_date,
          state: quickInfo.state || quickInfo.state___country,
          eventName: getText('h1, .page-title') || quickInfo.name,
          lgas: lgas.filter(lga => lga && !lga.includes('assistance')),
          assistanceTypes,
          fullContent: mainContent.substring(0, 5000),
          pageUrl: window.location.href
        };
      });
      
      return details;
    }
    
  } catch (error) {
    console.error(`[${jobId}] Task error:`, error);
    throw error;
  }
});

// API endpoint: Start full disaster sync
app.post('/sync/disasters', async (req, res) => {
  const jobId = uuidv4();
  const { immediate = false } = req.body;
  
  JOBS.set(jobId, { 
    status: 'running', 
    phase: 'listing',
    progress: 0,
    startedAt: new Date().toISOString()
  });
  
  // Start async processing
  (async () => {
    try {
      // Phase 1: Get all disaster URLs
      console.log(`[${jobId}] Phase 1: Getting disaster list...`);
      
      const disasters = await cluster.execute({ jobId, action: 'scrape_disaster_list' });
      
      JOBS.set(jobId, {
        ...JOBS.get(jobId),
        phase: 'details',
        totalDisasters: disasters.length,
        progress: 0
      });
      
      console.log(`[${jobId}] Found ${disasters.length} disasters`);
      
      // Phase 2: Get details for each disaster
      console.log(`[${jobId}] Phase 2: Getting details for each disaster...`);
      
      const allDetails = [];
      let processed = 0;
      
      for (const disaster of disasters) {
        if (disaster.url) {
          try {
            const details = await cluster.execute({
              jobId,
              action: 'scrape_disaster_details',
              url: disaster.url
            });
            
            allDetails.push({
              ...disaster,
              ...details,
              scrapedAt: new Date().toISOString()
            });
            
            processed++;
            
            // Update progress
            JOBS.set(jobId, {
              ...JOBS.get(jobId),
              progress: Math.round((processed / disasters.length) * 100)
            });
            
            // Save to database immediately if requested
            if (immediate && details.agrn) {
              await saveDisasterToDatabase(details);
            }
            
          } catch (error) {
            console.error(`[${jobId}] Failed to get details for ${disaster.url}:`, error.message);
          }
        }
      }
      
      // Phase 3: Save all to database
      console.log(`[${jobId}] Phase 3: Saving to database...`);
      
      if (!immediate) {
        let saved = 0;
        for (const disaster of allDetails) {
          if (disaster.agrn) {
            await saveDisasterToDatabase(disaster);
            saved++;
          }
        }
      }
      
      // Complete
      JOBS.set(jobId, {
        status: 'completed',
        totalDisasters: disasters.length,
        detailsScraped: allDetails.length,
        completedAt: new Date().toISOString()
      });
      
      console.log(`[${jobId}] Sync completed: ${allDetails.length} disasters processed`);
      
    } catch (error) {
      console.error(`[${jobId}] Sync failed:`, error);
      JOBS.set(jobId, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });
    }
  })();
  
  res.json({ jobId, status: 'started' });
});

// API endpoint: Check job status
app.get('/sync/status/:jobId', (req, res) => {
  const job = JOBS.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// API endpoint: Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    cluster: cluster.idle ? 'idle' : 'busy',
    jobs: JOBS.size
  });
});

// Helper: Save disaster to Supabase
async function saveDisasterToDatabase(disaster) {
  try {
    // Parse Australian date format
    const parseAusDate = (dateStr) => {
      if (!dateStr || dateStr === ' ') return null;
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [_, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    };
    
    // Save main declaration
    const { error: declError } = await supabase
      .from('disaster_declarations')
      .upsert({
        agrn_reference: disaster.agrn,
        event_name: disaster.eventName,
        disaster_type: detectDisasterType(disaster.eventName || disaster.fullContent),
        declaration_date: parseAusDate(disaster.startDate) || new Date().toISOString().split('T')[0],
        expiry_date: parseAusDate(disaster.endDate),
        declaration_status: disaster.endDate ? 'expired' : 'active',
        state_code: disaster.state || 'UNK',
        lga_code: 'MULTI',
        description: disaster.fullContent?.substring(0, 1000),
        declaration_authority: 'Australian Government',
        verification_url: disaster.pageUrl,
        source_url: disaster.pageUrl,
        data_source: 'disasterassist.gov.au',
        source_system: 'DisasterAssist',
        last_sync_timestamp: new Date().toISOString(),
        metadata: {
          lgas: disaster.lgas,
          assistance_types: disaster.assistanceTypes,
          quick_info: disaster.quickInfo
        }
      }, {
        onConflict: 'agrn_reference',
        ignoreDuplicates: false
      });
    
    if (declError) {
      console.error(`Failed to save declaration ${disaster.agrn}:`, declError);
      return;
    }
    
    // Save LGA mappings (critical for Medicare)
    for (const lga of disaster.lgas || []) {
      await supabase
        .from('disaster_lgas')
        .upsert({
          agrn_reference: disaster.agrn,
          lga_name: lga,
          lga_code: generateLgaCode(lga, disaster.state),
          added_date: parseAusDate(disaster.startDate) || new Date().toISOString().split('T')[0],
          currently_affected: !disaster.endDate,
          state_code: disaster.state || 'UNK'
        }, {
          onConflict: 'agrn_reference,lga_name',
          ignoreDuplicates: true
        });
    }
    
    // Log history
    await supabase
      .from('disaster_history')
      .insert({
        agrn_reference: disaster.agrn,
        change_type: 'sync_update',
        change_details: `Synced from ${disaster.pageUrl}`,
        synced_from_url: disaster.pageUrl
      });
    
  } catch (error) {
    console.error('Database save error:', error);
  }
}

function detectDisasterType(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('flood')) return 'flood';
  if (lower.includes('bushfire') || lower.includes('fire')) return 'bushfire';
  if (lower.includes('cyclone')) return 'cyclone';
  if (lower.includes('storm')) return 'severe_storm';
  if (lower.includes('earthquake')) return 'earthquake';
  if (lower.includes('drought')) return 'drought';
  if (lower.includes('pandemic') || lower.includes('covid')) return 'pandemic';
  return 'other';
}

function generateLgaCode(lgaName, state) {
  const hash = (lgaName || '').split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  const statePrefix = {
    'NSW': '1', 'VIC': '2', 'QLD': '3', 'SA': '4',
    'WA': '5', 'TAS': '6', 'NT': '7', 'ACT': '8'
  };
  
  return `${statePrefix[state] || '9'}${Math.abs(hash) % 9000 + 1000}`;
}

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Disaster Scraper Worker running on port ${PORT}`);
  console.log(`📊 Max concurrency: ${process.env.MAX_CONCURRENCY || 2}`);
  console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);
});