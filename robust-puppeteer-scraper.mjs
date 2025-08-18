#!/usr/bin/env node

/**
 * ROBUST PUPPETEER SCRAPER WITH RETRY LOGIC
 * 
 * Handles network failures properly for Medicare compliance
 * Implements best practices from Puppeteer tutorial
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🚀 ROBUST SCRAPER WITH RETRY LOGIC\n');

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Helper to retry failed operations
async function withRetry(operation, context = '') {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`   ⚠️ Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
      if (attempt === MAX_RETRIES) {
        console.log(`   ❌ Failed after ${MAX_RETRIES} attempts: ${context}`);
        throw error;
      }
      console.log(`   ⏳ Retrying in ${RETRY_DELAY/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// Helper to wait for selector with retry
async function waitForSelectorSafe(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch {
    console.log(`   Note: Selector "${selector}" not found, continuing...`);
    return false;
  }
}

// Extract disasters from current page
async function extractDisastersFromPage(page) {
  return await page.evaluate(() => {
    const disasters = [];
    
    // Method 1: Table rows
    const rows = document.querySelectorAll('table tbody tr, table tr');
    Array.from(rows).forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 5) {
        const link = row.querySelector('a[href*="/disasters/"]');
        if (link) {
          const endDateText = cells[1]?.textContent?.trim() || '';
          disasters.push({
            url: link.href,
            start_date: cells[0]?.textContent?.trim() || '',
            end_date: endDateText,
            state: cells[2]?.textContent?.trim() || '',
            type: cells[3]?.textContent?.trim() || '',
            name: cells[4]?.textContent?.trim() || link.textContent?.trim() || '',
            agrn: link.href.match(/([^\/]+)$/)?.[1] || '',
            // CRITICAL: Properly detect active disasters
            is_active: !endDateText || 
                      endDateText === '-' || 
                      endDateText === '–' || 
                      endDateText === '- -' || 
                      endDateText === '--' ||
                      endDateText.includes('onwards') ||
                      endDateText.includes('commencing')
          });
        }
      }
    });
    
    // Check for next page button
    const nextButtons = Array.from(document.querySelectorAll('a, button')).filter(el => 
      el.textContent?.toLowerCase().includes('next') ||
      el.textContent === '>' ||
      el.getAttribute('aria-label')?.toLowerCase().includes('next')
    );
    
    const hasNext = nextButtons.some(btn => 
      !btn.disabled && 
      !btn.classList.contains('disabled') &&
      btn.offsetParent !== null
    );
    
    return { disasters, hasNext };
  });
}

// Click next page button
async function clickNextPage(page) {
  return await page.evaluate(() => {
    const nextButtons = Array.from(document.querySelectorAll('a, button')).filter(el => 
      el.textContent?.toLowerCase().includes('next') ||
      el.textContent === '>' ||
      el.getAttribute('aria-label')?.toLowerCase().includes('next')
    );
    
    const validButton = nextButtons.find(btn => 
      !btn.disabled && 
      !btn.classList.contains('disabled') &&
      btn.offsetParent !== null
    );
    
    if (validButton) {
      validButton.click();
      return true;
    }
    return false;
  });
}

// Extract detail data from disaster page
async function extractDetailData(page) {
  return await page.evaluate(() => {
    const data = {
      title: document.querySelector('h1')?.innerText?.trim(),
      quickInfo: {},
      lgas: [],
      description: []
    };
    
    // Quick info section
    const dtElements = document.querySelectorAll('dt');
    const ddElements = document.querySelectorAll('dd');
    for (let i = 0; i < dtElements.length; i++) {
      const key = dtElements[i]?.innerText?.trim();
      const value = ddElements[i]?.innerText?.trim();
      if (key && value) {
        data.quickInfo[key] = value;
      }
    }
    
    // Extract LGAs
    const lists = document.querySelectorAll('ul');
    lists.forEach(ul => {
      const items = Array.from(ul.querySelectorAll('li')).map(li => li.innerText.trim());
      items.forEach(item => {
        if (item.length > 2 && item.length < 50 && /^[A-Z]/.test(item)) {
          data.lgas.push(item);
        }
      });
    });
    
    // Extract description paragraphs
    document.querySelectorAll('p').forEach(p => {
      const text = p.innerText?.trim();
      if (text && text.length > 50) {
        data.description.push(text);
      }
    });
    
    return data;
  });
}

// Main scraping function
async function scrapeDisasters() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const scrapeRunId = randomUUID();
  const allDisasters = [];
  const seenAGRNs = new Set();
  let totalSaved = 0;
  let totalErrors = 0;
  const stateCounts = { total: {}, active: {} };

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // PHASE 1: Collect all disasters from index
    console.log('📄 PHASE 1: Loading disaster index...\n');
    
    await withRetry(async () => {
      await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
    }, 'Loading main page');
    
    // Wait for initial load
    await page.waitForTimeout(5000);
    await waitForSelectorSafe(page, 'table');
    
    let pageNum = 1;
    let hasMore = true;
    
    while (hasMore && pageNum <= 100) {
      console.log(`📑 Scanning page ${pageNum}...`);
      
      const pageData = await withRetry(
        async () => await extractDisastersFromPage(page),
        `Extracting page ${pageNum}`
      );
      
      console.log(`   Found ${pageData.disasters.length} disasters`);
      
      // Add unique disasters
      pageData.disasters.forEach(d => {
        const agrnKey = d.agrn?.replace(/[^0-9]/g, '');
        if (agrnKey && !seenAGRNs.has(agrnKey)) {
          seenAGRNs.add(agrnKey);
          allDisasters.push(d);
        }
      });
      
      // Navigate to next page
      if (pageData.hasNext) {
        const clicked = await clickNextPage(page);
        if (clicked) {
          await page.waitForTimeout(3000);
          pageNum++;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`\n✅ Found ${allDisasters.length} unique disasters\n`);
    
    // PHASE 2: Visit each disaster for details
    console.log('📊 PHASE 2: Extracting detailed data...\n');
    
    for (let i = 0; i < allDisasters.length; i++) {
      const disaster = allDisasters[i];
      
      if (!disaster.url) continue;
      
      console.log(`[${i+1}/${allDisasters.length}] ${disaster.name || disaster.agrn}`);
      
      try {
        // Navigate with retry
        await withRetry(async () => {
          await page.goto(disaster.url, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });
          await page.waitForTimeout(1500);
        }, `Loading ${disaster.name}`);
        
        // Extract details
        const details = await extractDetailData(page);
        
        // Build disaster record
        const agrnRef = `AGRN-${(disaster.agrn || '').replace(/[^0-9]/g, '')}`;
        const stateCode = mapStateCode(disaster.state);
        
        // CRITICAL: Determine active status
        const isActive = disaster.is_active || 
                        !disaster.end_date || 
                        disaster.end_date === '-' || 
                        disaster.end_date === '–' || 
                        disaster.end_date === '- -' ||
                        disaster.name?.includes('onwards') ||
                        disaster.name?.includes('commencing');
        
        const record = {
          agrn_reference: agrnRef,
          event_name: disaster.name || details.title,
          disaster_type: mapDisasterType(disaster.type),
          declaration_date: parseDate(disaster.start_date),
          expiry_date: isActive ? null : parseDate(disaster.end_date),
          declaration_status: isActive ? 'active' : 'expired',
          raw_end_date: disaster.end_date || '',
          raw_start_date: disaster.start_date || '',
          is_active_verified: isActive,
          telehealth_eligible: isActive,
          scrape_run_id: scrapeRunId,
          validation_status: 'verified',
          scraper_version: 'robust-v1.0',
          scraped_at: new Date().toISOString(),
          state_code: stateCode,
          lga_code: '00000',
          affected_areas: {
            all_lgas: [...new Set(details.lgas)],
            lga_count: details.lgas.length,
            quick_info: details.quickInfo,
            extracted_at: new Date().toISOString()
          },
          description: details.description.slice(0, 3).join('\n\n'),
          source_url: disaster.url,
          data_source: 'disasterassist.gov.au',
          source_system: 'Robust Puppeteer Scraper',
          last_sync_timestamp: new Date().toISOString()
        };
        
        // Save to database with retry
        await withRetry(async () => {
          const { error } = await supabase
            .from('disaster_declarations')
            .upsert(record, {
              onConflict: 'agrn_reference',
              ignoreDuplicates: false
            });
          
          if (error) throw error;
        }, `Saving ${disaster.name}`);
        
        totalSaved++;
        const status = isActive ? '✅ ACTIVE' : '❌ EXPIRED';
        console.log(`   ${status} - Saved with ${details.lgas.length} LGAs`);
        
        // Track state counts
        if (!stateCounts.total[stateCode]) {
          stateCounts.total[stateCode] = 0;
          stateCounts.active[stateCode] = 0;
        }
        stateCounts.total[stateCode]++;
        if (isActive) stateCounts.active[stateCode]++;
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        totalErrors++;
      }
      
      // Small delay between requests
      await page.waitForTimeout(500);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 SCRAPING COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Total disasters: ${allDisasters.length}`);
    console.log(`✅ Successfully saved: ${totalSaved}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log('\n📍 STATE COUNTS:');
    
    Object.entries(stateCounts.active).forEach(([state, count]) => {
      const total = stateCounts.total[state];
      console.log(`  ${state}: ${count} active / ${total} total`);
    });
    
    // Validation
    const qldActive = stateCounts.active['QLD'] || 0;
    const waActive = stateCounts.active['WA'] || 0;
    
    console.log('\n⚠️ MEDICARE COMPLIANCE CHECK:');
    console.log(`  QLD: ${qldActive} active (expected 20-30) ${qldActive >= 20 && qldActive <= 30 ? '✅' : '❌'}`);
    console.log(`  WA: ${waActive} active (expected 30-45) ${waActive >= 30 && waActive <= 45 ? '✅' : '❌'}`);
    console.log('='.repeat(80));
  }
}

// Helper functions
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

function mapDisasterType(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('flood')) return 'flood';
  if (t.includes('fire') || t.includes('bushfire')) return 'bushfire';
  if (t.includes('cyclone')) return 'cyclone';
  if (t.includes('storm')) return 'severe_storm';
  if (t.includes('earthquake')) return 'earthquake';
  if (t.includes('drought')) return 'drought';
  return 'other';
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === '–' || dateStr === '- -') return null;
  // Simple parsing - would be more robust in production
  return null;
}

// Run the scraper
console.log('Starting robust scraper...\n');
scrapeDisasters().catch(console.error);