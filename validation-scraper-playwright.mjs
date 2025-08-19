#!/usr/bin/env node

/**
 * VALIDATION SCRAPER - PLAYWRIGHT VERSION
 * 
 * Purpose: Full validation scraper that must return IDENTICAL results to Puppeteer
 * This is the SECOND scraper for dual-validation Medicare compliance
 * 
 * DIFFERENT from Puppeteer in:
 * - Uses Playwright instead of Puppeteer
 * - Different DOM traversal strategy
 * - Alternative date parsing approach
 * - Independent LGA extraction
 * - Separate error handling
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfbohkqmykagkdmggcxw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🎭 VALIDATION SCRAPER (PLAYWRIGHT) - Full Medicare Compliance Check\n');
console.log('This is the SECOND scraper for dual-validation\n');

const TEST_MODE = process.argv.includes('--test');
const VALIDATION_RUN_ID = crypto.randomUUID();

console.log(`Mode: ${TEST_MODE ? 'TEST (2 pages)' : 'FULL VALIDATION (all pages)'}`);
console.log(`Validation Run ID: ${VALIDATION_RUN_ID}\n`);

// Helper functions with DIFFERENT implementation than Puppeteer
function parseDisasterDate(dateStr) {
  // CRITICAL: Preserve NULL for active disasters
  // MUST match Puppeteer's logic exactly for validation
  if (!dateStr || dateStr === '-' || dateStr === '–' || dateStr === '- -' || dateStr === '--' || dateStr === '') {
    return null;
  }
  
  // Use different parsing strategy than Puppeteer
  try {
    // Map month names differently
    const monthMap = new Map([
      ['January', '01'], ['Jan', '01'],
      ['February', '02'], ['Feb', '02'],
      ['March', '03'], ['Mar', '03'],
      ['April', '04'], ['Apr', '04'],
      ['May', '05'], ['May', '05'],
      ['June', '06'], ['Jun', '06'],
      ['July', '07'], ['Jul', '07'],
      ['August', '08'], ['Aug', '08'],
      ['September', '09'], ['Sep', '09'],
      ['October', '10'], ['Oct', '10'],
      ['November', '11'], ['Nov', '11'],
      ['December', '12'], ['Dec', '12']
    ]);

    // Try different regex patterns
    const patterns = [
      /(\d{1,2})\s+(\w+)\s+(\d{4})/,  // 1 March 2025
      /(\w+)\s+(\d{4})/,               // March 2025
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (match.length === 4) { // Day Month Year
          const day = match[1].padStart(2, '0');
          const month = monthMap.get(match[2]);
          const year = match[3];
          if (month) return `${year}-${month}-${day}`;
        } else if (match.length === 3) { // Month Year
          const month = monthMap.get(match[1]);
          const year = match[2];
          if (month) return `${year}-${month}-01`;
        }
      }
    }
  } catch (e) {
    console.error('Date parse error:', e);
  }
  
  return null;
}

function extractStateFromContext(text, url) {
  // Different state extraction logic
  const statePatterns = [
    /\b(NSW|New South Wales)\b/i,
    /\b(VIC|Victoria)\b/i,
    /\b(QLD|Queensland)\b/i,
    /\b(WA|Western Australia)\b/i,
    /\b(SA|South Australia)\b/i,
    /\b(TAS|Tasmania)\b/i,
    /\b(NT|Northern Territory)\b/i,
    /\b(ACT|Australian Capital Territory)\b/i
  ];

  const stateMap = {
    'New South Wales': 'NSW', 'NSW': 'NSW',
    'Victoria': 'VIC', 'VIC': 'VIC',
    'Queensland': 'QLD', 'QLD': 'QLD',
    'Western Australia': 'WA', 'WA': 'WA',
    'South Australia': 'SA', 'SA': 'SA',
    'Tasmania': 'TAS', 'TAS': 'TAS',
    'Northern Territory': 'NT', 'NT': 'NT',
    'Australian Capital Territory': 'ACT', 'ACT': 'ACT'
  };

  for (const pattern of statePatterns) {
    const match = text.match(pattern);
    if (match) {
      return stateMap[match[1]] || match[1];
    }
  }

  return 'UNKNOWN';
}

function mapDisasterTypeAlternative(typeStr) {
  // Different type mapping logic
  const normalized = (typeStr || '').toLowerCase().trim();
  
  const typeMap = {
    'flood': ['flood', 'flooding', 'floods'],
    'bushfire': ['fire', 'bushfire', 'wildfire', 'forest fire'],
    'cyclone': ['cyclone', 'tropical cyclone', 'tc'],
    'severe_storm': ['storm', 'severe storm', 'thunderstorm', 'hail'],
    'earthquake': ['earthquake', 'tremor', 'seismic'],
    'drought': ['drought', 'dry conditions']
  };

  for (const [type, keywords] of Object.entries(typeMap)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return type;
    }
  }

  return 'other';
}

async function scrapeWithPlaywright() {
  const browser = await chromium.launch({
    headless: false, // Show browser for visibility
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  const allDisasters = [];
  const seenAGRNs = new Set();
  let totalSaved = 0;
  let totalErrors = 0;

  // Track state counts for validation
  const stateCounts = {
    active: {},
    total: {}
  };

  try {
    console.log('📄 Navigating to DisasterAssist website...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for content to load
    await page.waitForSelector('table', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // STEP 1: Collect all disaster links
    console.log('\n📊 STEP 1: Collecting disasters from all pages...\n');
    
    let pageNum = 1;
    let hasMore = true;
    const maxPages = TEST_MODE ? 2 : 50;

    while (hasMore && pageNum <= maxPages) {
      console.log(`📑 Page ${pageNum}...`);

      // Extract disasters from current page using Playwright locators
      const pageDisasters = await page.evaluate(() => {
        const disasters = [];
        const rows = document.querySelectorAll('table tbody tr, table tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const link = row.querySelector('a[href*="/disasters/"]');
            if (link) {
              disasters.push({
                url: link.href,
                startDate: cells[0]?.textContent?.trim(),
                endDate: cells[1]?.textContent?.trim(),
                state: cells[2]?.textContent?.trim(),
                type: cells[3]?.textContent?.trim(),
                name: cells[4]?.textContent?.trim() || link.textContent?.trim(),
                agrn: link.textContent?.match(/AGRN[- ]?(\d+)/i)?.[1] || 
                      cells[cells.length - 1]?.textContent?.match(/AGRN[- ]?(\d+)/i)?.[1]
              });
            }
          }
        });
        
        return disasters;
      });

      console.log(`   Found ${pageDisasters.length} disasters`);

      // Add unique disasters
      for (const disaster of pageDisasters) {
        const agrnKey = disaster.agrn || disaster.name;
        if (agrnKey && !seenAGRNs.has(agrnKey)) {
          seenAGRNs.add(agrnKey);
          allDisasters.push(disaster);
        }
      }

      // Navigate to next page
      if (pageNum < maxPages) {
        const nextExists = await page.evaluate(() => {
          const nextLinks = Array.from(document.querySelectorAll('a, button')).filter(el =>
            el.textContent?.toLowerCase().includes('next') ||
            el.textContent === '>' ||
            el.getAttribute('aria-label')?.toLowerCase().includes('next')
          );
          
          const validNext = nextLinks.find(btn =>
            !btn.disabled &&
            !btn.classList.contains('disabled') &&
            btn.offsetParent !== null
          );
          
          if (validNext) {
            validNext.click();
            return true;
          }
          return false;
        });

        if (nextExists) {
          await page.waitForTimeout(3000);
          pageNum++;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`\n✅ Collected ${allDisasters.length} unique disasters\n`);

    // STEP 2: Visit each disaster page
    console.log('📊 STEP 2: Extracting detailed data from each disaster...\n');

    for (let i = 0; i < allDisasters.length; i++) {
      const disaster = allDisasters[i];
      
      if (!disaster.url) continue;

      try {
        console.log(`[${i+1}/${allDisasters.length}] ${disaster.name || disaster.agrn}`);

        await page.goto(disaster.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(1500);

        // Extract data using Playwright methods
        const title = await page.textContent('h1') || disaster.name;
        
        // Extract quick info
        const quickInfo = await page.evaluate(() => {
          const info = {};
          document.querySelectorAll('dt').forEach((dt, idx) => {
            const dd = document.querySelectorAll('dd')[idx];
            if (dt && dd) {
              info[dt.textContent.trim()] = dd.textContent.trim();
            }
          });
          return info;
        });

        // Extract LGAs using different method than Puppeteer
        const lgas = await page.evaluate(() => {
          const lgaSet = new Set();
          
          // Method 1: Find by heading
          const headings = document.querySelectorAll('h2, h3, h4, h5');
          headings.forEach(h => {
            if (h.textContent?.includes('Local Government Area') || 
                h.textContent?.includes('Affected area')) {
              let sibling = h.nextElementSibling;
              while (sibling && !sibling.matches('h2, h3, h4')) {
                if (sibling.matches('ul, ol')) {
                  sibling.querySelectorAll('li').forEach(li => {
                    const text = li.textContent?.trim();
                    if (text && text.length > 2 && text.length < 50) {
                      lgaSet.add(text);
                    }
                  });
                }
                sibling = sibling.nextElementSibling;
              }
            }
          });

          // Method 2: Find lists with location-like content
          if (lgaSet.size === 0) {
            document.querySelectorAll('ul, ol').forEach(list => {
              const items = Array.from(list.querySelectorAll('li'));
              if (items.length >= 3) {
                const texts = items.map(li => li.textContent?.trim()).filter(Boolean);
                const hasLocationPattern = texts.some(t => 
                  /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(t) && t.length < 50
                );
                if (hasLocationPattern) {
                  texts.forEach(t => {
                    if (t && t.length > 2 && t.length < 50) lgaSet.add(t);
                  });
                }
              }
            });
          }

          return Array.from(lgaSet);
        });

        // Get page text for state extraction
        const pageText = await page.textContent('body');
        const stateCode = extractStateFromContext(pageText, disaster.url);

        // Parse dates
        const startDate = parseDisasterDate(disaster.startDate);
        const endDate = parseDisasterDate(disaster.endDate);
        const rawEndDate = disaster.endDate || '';
        
        // CRITICAL: Determine active status (MUST match Puppeteer logic)
        const isActive = !endDate || rawEndDate === '-' || rawEndDate === '–' || rawEndDate === '- -' || rawEndDate === '--' || rawEndDate === '';
        const status = isActive ? 'active' : 'expired';

        // Extract AGRN
        const agrnMatch = pageText.match(/AGRN[- ]?(\d+)/i);
        const agrn = agrnMatch ? agrnMatch[1] : disaster.agrn || '';

        // Build record
        const record = {
          agrn_reference: `AGRN-${agrn}`,
          event_name: title,
          disaster_type: mapDisasterTypeAlternative(disaster.type),
          declaration_date: startDate,
          expiry_date: endDate,
          raw_end_date: rawEndDate,
          declaration_status: status,
          is_active_verified: isActive,
          validation_run_id: VALIDATION_RUN_ID,
          validation_status: 'playwright_validated',
          scraper_version: 'playwright-validation-v1.0',
          state_code: stateCode,
          lga_code: '00000', // Placeholder
          affected_areas: {
            all_lgas: lgas,
            lga_count: lgas.length,
            quick_info: quickInfo
          },
          description: '',
          source_url: disaster.url,
          verification_url: disaster.url,
          data_source: 'disasterassist.gov.au',
          source_system: 'Playwright Validation Scraper',
          last_sync_timestamp: new Date().toISOString()
        };

        // Save to validation table for comparison with Puppeteer
        const { error } = await supabase
          .from('disaster_declarations_validation')
          .upsert({
            agrn: `AGRN-${agrn}`,
            name: title,
            type: mapDisasterTypeAlternative(disaster.type),
            state_code: stateCode,
            start_date: startDate,
            end_date: endDate, // NULL for active disasters
            affected_lgas: lgas,
            scraper_source: 'playwright'
          }, {
            onConflict: 'agrn',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`   ❌ Error: ${error.message}`);
          totalErrors++;
        } else {
          console.log(`   ✅ Saved - ${isActive ? 'ACTIVE' : 'EXPIRED'} - ${lgas.length} LGAs`);
          totalSaved++;
          
          // Track counts
          if (!stateCounts.total[stateCode]) stateCounts.total[stateCode] = 0;
          if (!stateCounts.active[stateCode]) stateCounts.active[stateCode] = 0;
          stateCounts.total[stateCode]++;
          if (isActive) stateCounts.active[stateCode]++;
        }

      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
        totalErrors++;
      }

      // Rate limiting
      await page.waitForTimeout(800 + Math.random() * 400);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();

    console.log('\n' + '='.repeat(80));
    console.log('🎭 PLAYWRIGHT VALIDATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Validation Run ID: ${VALIDATION_RUN_ID}`);
    console.log(`Total disasters processed: ${allDisasters.length}`);
    console.log(`Successfully saved: ${totalSaved}`);
    console.log(`Errors: ${totalErrors}`);
    
    console.log('\n📊 STATE BREAKDOWN:');
    Object.entries(stateCounts.total).forEach(([state, total]) => {
      const active = stateCounts.active[state] || 0;
      console.log(`  ${state}: ${active} active / ${total} total`);
    });

    // Validation checks
    console.log('\n🔍 VALIDATION CHECKS:');
    const qldActive = stateCounts.active['QLD'] || 0;
    const waActive = stateCounts.active['WA'] || 0;
    
    console.log(`  QLD Active: ${qldActive} (expected 20-30) ${qldActive >= 20 && qldActive <= 30 ? '✅' : '❌'}`);
    console.log(`  WA Active: ${waActive} (expected 30-45) ${waActive >= 30 && waActive <= 45 ? '✅' : '❌'}`);

    console.log('\n💡 Next step: Run comparison engine to validate against Puppeteer');
    console.log('Command: npm run scraper:compare');
    console.log('='.repeat(80));
  }
}

// Run it
console.log('Starting Playwright validation scraper in 3 seconds...\n');
setTimeout(() => {
  scrapeWithPlaywright().catch(console.error);
}, 3000);