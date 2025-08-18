#!/usr/bin/env node

/**
 * TEST/AUDIT SCRAPER - PLAYWRIGHT VERSION
 * 
 * Purpose: Validation scraper using different technology stack
 * Must return identical results to Puppeteer scraper for Medicare compliance
 * 
 * Key Differences from Puppeteer scraper:
 * 1. Uses Playwright instead of Puppeteer
 * 2. Different HTML parsing strategy
 * 3. Alternative date parsing logic
 * 4. Independent LGA extraction method
 * 5. Separate validation checks
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🔍 TEST/AUDIT SCRAPER (PLAYWRIGHT) - Medicare Compliance Validation\n');
console.log('This scraper validates primary scraper accuracy using different extraction logic\n');

// Configuration
const CONFIG = {
  test_mode: process.argv.includes('--test'),
  pages_to_scrape: process.argv.includes('--test') ? 2 : 38, // Test mode scrapes only 2 pages
  max_concurrency: 3,
  min_delay_ms: 500,
  max_delay_ms: 1500,
  evidence_dir: './evidence',
  validation_run_id: crypto.randomUUID()
};

// Helper functions with DIFFERENT logic than Puppeteer
const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * DIFFERENT date parsing logic than Puppeteer scraper
 * Uses regex patterns instead of string manipulation
 */
function parseDateAlternative(dateStr) {
  // CRITICAL: Check for active indicators FIRST
  if (!dateStr || dateStr === '-' || dateStr === '–' || dateStr === '—' || dateStr === 'N/A') {
    return null; // NULL means active
  }

  // Pattern matching approach (different from Puppeteer)
  const patterns = [
    // DD Month YYYY
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
    // DD MMM YYYY  
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
    // Month YYYY
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
    // MMM YYYY
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i
  ];

  const monthMap = {
    'January': '01', 'Jan': '01',
    'February': '02', 'Feb': '02',
    'March': '03', 'Mar': '03',
    'April': '04', 'Apr': '04',
    'May': '05', 'May': '05',
    'June': '06', 'Jun': '06',
    'July': '07', 'Jul': '07',
    'August': '08', 'Aug': '08',
    'September': '09', 'Sep': '09',
    'October': '10', 'Oct': '10',
    'November': '11', 'Nov': '11',
    'December': '12', 'Dec': '12'
  };

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      if (match.length === 4) { // DD Month YYYY
        const day = match[1].padStart(2, '0');
        const month = monthMap[match[2]];
        const year = match[3];
        return `${year}-${month}-${day}`;
      } else if (match.length === 3) { // Month YYYY
        const month = monthMap[match[1]];
        const year = match[2];
        return `${year}-${month}-01`;
      }
    }
  }

  return null;
}

/**
 * DIFFERENT LGA extraction logic than Puppeteer
 * Uses DOM traversal instead of text parsing
 */
async function extractLGAsAlternative(page) {
  return await page.evaluate(() => {
    const lgas = new Set();
    
    // Method 1: Find by heading then next list
    const headings = document.querySelectorAll('h2, h3, h4');
    headings.forEach(heading => {
      if (heading.textContent?.includes('Local Government Areas') || 
          heading.textContent?.includes('Affected areas')) {
        let nextElement = heading.nextElementSibling;
        while (nextElement && nextElement.tagName !== 'H2' && nextElement.tagName !== 'H3') {
          if (nextElement.tagName === 'UL' || nextElement.tagName === 'OL') {
            const items = nextElement.querySelectorAll('li');
            items.forEach(item => {
              const text = item.textContent?.trim();
              if (text && text.length > 2 && text.length < 50) {
                lgas.add(text);
              }
            });
          }
          nextElement = nextElement.nextElementSibling;
        }
      }
    });

    // Method 2: Find lists with LGA-like content
    const allLists = document.querySelectorAll('ul, ol');
    allLists.forEach(list => {
      const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent?.trim());
      // If list has 3+ items that look like place names
      const placeNamePattern = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/;
      const likelyLGAs = items.filter(item => 
        item && item.length > 2 && item.length < 50 && placeNamePattern.test(item)
      );
      if (likelyLGAs.length >= 3) {
        likelyLGAs.forEach(lga => lgas.add(lga));
      }
    });

    return Array.from(lgas);
  });
}

/**
 * Extract disaster data using Playwright-specific methods
 */
async function extractDisasterDetails(page, url) {
  const started = Date.now();
  
  try {
    // Block unnecessary resources for speed
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Capture evidence
    const html = await page.content();
    const sha = hash(html);
    const screenshot = await page.screenshot({ fullPage: true });

    // Extract data using Playwright selectors
    const title = await page.textContent('h1') || '';
    
    // Extract AGRN differently than Puppeteer
    const pageText = await page.evaluate(() => document.body.innerText);
    const agrnMatch = pageText.match(/AGRN[\s-]?(\d+)/i);
    const agrn = agrnMatch ? agrnMatch[1] : '';

    // Extract dates from Quick Info section
    let startDate = null;
    let endDate = null;
    
    const quickInfo = await page.evaluate(() => {
      const info = {};
      const dtElements = document.querySelectorAll('dt');
      const ddElements = document.querySelectorAll('dd');
      
      for (let i = 0; i < dtElements.length; i++) {
        const key = dtElements[i]?.textContent?.trim();
        const value = ddElements[i]?.textContent?.trim();
        if (key && value) {
          info[key] = value;
        }
      }
      return info;
    });

    // Parse dates from quick info
    if (quickInfo['Start date']) {
      startDate = parseDateAlternative(quickInfo['Start date']);
    }
    if (quickInfo['End date']) {
      endDate = parseDateAlternative(quickInfo['End date']);
    }

    // Extract LGAs using alternative method
    const lgas = await extractLGAsAlternative(page);

    // Determine status
    const isActive = !endDate || quickInfo['End date'] === '-';
    const status = isActive ? 'active' : 'expired';

    // Extract state from URL or content
    const stateMatch = pageText.match(/(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)/);
    const stateCode = stateMatch ? stateMatch[1] : 'UNKNOWN';

    return {
      success: true,
      data: {
        url,
        agrn_reference: `AGRN-${agrn}`,
        event_name: title,
        declaration_date: startDate,
        expiry_date: endDate,
        raw_end_date: quickInfo['End date'] || '',
        declaration_status: status,
        state_code: stateCode,
        affected_lgas: lgas,
        lga_count: lgas.length,
        quick_info: quickInfo,
        scraped_at: new Date().toISOString(),
        scraper_version: 'playwright-audit-v1.0'
      },
      evidence: {
        html,
        sha256: sha,
        screenshot: screenshot.toString('base64'),
        duration_ms: Date.now() - started
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url,
      duration_ms: Date.now() - started
    };
  }
}

/**
 * Main audit scraper function
 */
async function runAuditScraper() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    validation_run_id: CONFIG.validation_run_id,
    started_at: new Date().toISOString(),
    scraper_type: 'playwright',
    pages_to_scrape: CONFIG.pages_to_scrape,
    disasters_found: [],
    errors: [],
    evidence_captured: 0,
    validation_metrics: {
      null_dates_found: 0,
      active_disasters: 0,
      state_counts: {}
    }
  };

  try {
    // Create evidence directory
    await fs.mkdir(CONFIG.evidence_dir, { recursive: true });

    // Create browser contexts for concurrency
    const contexts = await Promise.all(
      Array(CONFIG.max_concurrency).fill(0).map(() => browser.newContext())
    );
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    console.log(`📄 Loading disasters list page...`);
    
    // Navigate to main page
    const mainPage = pages[0];
    await mainPage.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Extract disaster links
    const disasterLinks = await mainPage.evaluate(() => {
      const links = [];
      const rows = document.querySelectorAll('table tbody tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const link = row.querySelector('a[href*="/disasters/"]');
          if (link) {
            links.push({
              url: link.href,
              startDate: cells[0]?.textContent?.trim(),
              endDate: cells[1]?.textContent?.trim(),
              state: cells[2]?.textContent?.trim(),
              type: cells[3]?.textContent?.trim(),
              name: cells[4]?.textContent?.trim()
            });
          }
        }
      });
      
      return links;
    });

    console.log(`Found ${disasterLinks.length} disasters on page`);
    
    // Limit to configured number of pages for testing
    const linksToProcess = disasterLinks.slice(0, CONFIG.pages_to_scrape);
    console.log(`Processing ${linksToProcess.length} disasters (${CONFIG.test_mode ? 'TEST MODE' : 'FULL AUDIT'})\n`);

    // Process disasters with concurrency
    let processed = 0;
    for (const disaster of linksToProcess) {
      const pageIndex = processed % CONFIG.max_concurrency;
      const page = pages[pageIndex];
      
      // Rate limiting
      const delay = CONFIG.min_delay_ms + Math.random() * (CONFIG.max_delay_ms - CONFIG.min_delay_ms);
      await sleep(delay);

      console.log(`[${processed + 1}/${linksToProcess.length}] Processing ${disaster.name}...`);
      
      const result = await extractDisasterDetails(page, disaster.url);
      
      if (result.success) {
        results.disasters_found.push(result.data);
        
        // Update metrics
        if (result.data.expiry_date === null) {
          results.validation_metrics.null_dates_found++;
        }
        if (result.data.declaration_status === 'active') {
          results.validation_metrics.active_disasters++;
        }
        
        const state = result.data.state_code;
        results.validation_metrics.state_counts[state] = 
          (results.validation_metrics.state_counts[state] || 0) + 1;

        // Save evidence
        const evidenceFile = `${CONFIG.evidence_dir}/${result.data.agrn_reference}_${result.evidence.sha256.substring(0, 8)}.json`;
        await fs.writeFile(evidenceFile, JSON.stringify({
          ...result.data,
          evidence: {
            sha256: result.evidence.sha256,
            screenshot_base64: result.evidence.screenshot,
            scraped_at: new Date().toISOString()
          }
        }, null, 2));
        
        results.evidence_captured++;
        
        // Store in test table
        if (!CONFIG.test_mode) {
          const { error } = await supabase
            .from('test_disaster_declarations')
            .upsert(result.data, {
              onConflict: 'agrn_reference',
              ignoreDuplicates: false
            });
          
          if (error) {
            console.error(`   ❌ Database error: ${error.message}`);
            results.errors.push({ url: disaster.url, error: error.message });
          } else {
            console.log(`   ✅ Saved to test table`);
          }
        }
      } else {
        console.error(`   ❌ Failed: ${result.error}`);
        results.errors.push({ url: disaster.url, error: result.error });
      }
      
      processed++;
    }

  } catch (error) {
    console.error('Fatal error:', error);
    results.errors.push({ fatal: true, error: error.message });
  } finally {
    await browser.close();
    
    results.completed_at = new Date().toISOString();
    
    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('🔍 AUDIT SCRAPER COMPLETE');
    console.log('='.repeat(80));
    console.log(`Validation Run ID: ${results.validation_run_id}`);
    console.log(`Disasters processed: ${results.disasters_found.length}`);
    console.log(`Errors: ${results.errors.length}`);
    console.log(`Evidence captured: ${results.evidence_captured}`);
    console.log('\n📊 VALIDATION METRICS:');
    console.log(`Active disasters (NULL dates): ${results.validation_metrics.null_dates_found}`);
    console.log(`Active by status: ${results.validation_metrics.active_disasters}`);
    console.log('\nState breakdown:');
    Object.entries(results.validation_metrics.state_counts).forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });
    
    // Save validation report
    const reportFile = `${CONFIG.evidence_dir}/validation_report_${CONFIG.validation_run_id}.json`;
    await fs.writeFile(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Validation report saved to ${reportFile}`);
    
    // Store in database if not test mode
    if (!CONFIG.test_mode) {
      const { error } = await supabase
        .from('scraper_validation_runs')
        .insert({
          id: results.validation_run_id,
          scraper_type: 'playwright',
          started_at: results.started_at,
          completed_at: results.completed_at,
          disasters_checked: results.disasters_found.length,
          null_dates_found: results.validation_metrics.null_dates_found,
          active_disasters: results.validation_metrics.active_disasters,
          state_counts: results.validation_metrics.state_counts,
          errors: results.errors,
          evidence_path: reportFile
        });
      
      if (error) {
        console.error('Failed to save validation run:', error);
      } else {
        console.log('✅ Validation run saved to database');
      }
    }
    
    console.log('='.repeat(80));
  }
}

// Run the scraper
console.log('Starting audit scraper in 3 seconds...\n');
setTimeout(() => {
  runAuditScraper().catch(console.error);
}, 3000);