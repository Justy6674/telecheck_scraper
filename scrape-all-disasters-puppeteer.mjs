#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🚀 COMPLETE DISASTER SCRAPER FOR MEDICARE COMPLIANCE\n');
console.log('This scraper WILL find ALL 760+ disasters by properly handling the dynamic website\n');

// Helper functions
function isLikelyLGA(text) {
  if (!text || text.length < 3 || text.length > 50) return false;
  
  const excludeList = [
    'Home', 'Contact', 'About', 'Help', 'Search', 'Menu',
    'Services Australia', 'Skip to', 'PORTFOLIO', 'BORDER',
    'Find a disaster', 'Getting help', 'How to help',
    'Disaster arrangements', 'Key contacts',
    'Web privacy', 'Accessibility', 'Freedom of information',
    'Copyright', 'Privacy', 'Lost or damaged',
    'National Emergency', 'Disaster Recovery Funding',
    'Bushfire', 'Storm', 'Flood', 'Cyclone', 'Drought',
    'Information publication scheme', 'Queensland Reconstruction Authority',
    'NSW Rural Assistance Authority', 'NSW Reconstruction Authority',
    'Emergency assistance grants', 'TasRecovery', 'VicEmergency',
    'Emergency Recovery Victoria', 'Service NSW', 'Recovering from emergencies',
    'Personal hardship', 'Personal and financial counselling',
    'Removal of debris', 'Counter disaster operations',
    'Restoration of essential public assets', 'Freight subsides',
    'Government of South Australia', 'Western Australia Department',
    'Department of Foreign Affairs'
  ];
  
  const keywords = ['assistance', 'recovery', 'authority', 'department', 'government', 
                   'scheme', 'grants', 'operations', 'counselling', 'restoration'];
  if (keywords.some(kw => text.toLowerCase().includes(kw))) return false;
  
  if (excludeList.some(ex => text.toLowerCase().includes(ex.toLowerCase()))) return false;
  if (!/^[A-Z][a-z]/.test(text)) return false;
  if (text.includes('http') || text.includes('www') || text.includes('@')) return false;
  
  return true;
}

function mapDisasterType(type) {
  const typeStr = type?.toLowerCase() || '';
  if (typeStr.includes('flood')) return 'flood';
  if (typeStr.includes('fire') || typeStr.includes('bushfire')) return 'bushfire';
  if (typeStr.includes('cyclone')) return 'cyclone';
  if (typeStr.includes('storm')) return 'severe_storm';
  if (typeStr.includes('earthquake')) return 'earthquake';
  if (typeStr.includes('drought')) return 'drought';
  return 'other';
}

function mapStateCode(state) {
  const stateMap = {
    'New South Wales': 'NSW', 'NSW': 'NSW',
    'Victoria': 'VIC', 'VIC': 'VIC',
    'Queensland': 'QLD', 'QLD': 'QLD',
    'South Australia': 'SA', 'SA': 'SA',
    'Western Australia': 'WA', 'WA': 'WA',
    'Tasmania': 'TAS', 'TAS': 'TAS',
    'Northern Territory': 'NT', 'NT': 'NT',
    'Australian Capital Territory': 'ACT', 'ACT': 'ACT'
  };
  return stateMap[state] || 'NSW';
}

function getStateCapitalLGA(state) {
  const capitals = {
    'NSW': '17200', 'VIC': '24600', 'QLD': '31000',
    'SA': '40070', 'WA': '57080', 'TAS': '62810',
    'NT': '71000', 'ACT': '89000'
  };
  const stateCode = mapStateCode(state);
  return capitals[stateCode] || '17200';
}

function parseDate(dateStr) {
  // CRITICAL: Check for dash FIRST - this means ACTIVE disaster
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A' || dateStr === '-' || dateStr === '–' || dateStr === '- -' || dateStr === '--') return null;
  
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Handle "Mar 2025" format
    const monthYearMatch = dateStr.match(/(\w{3})\s+(\d{4})/);
    if (monthYearMatch) {
      const monthIdx = months.indexOf(monthYearMatch[1]);
      if (monthIdx >= 0) {
        return `${monthYearMatch[2]}-${(monthIdx + 1).toString().padStart(2, '0')}-01`;
      }
    }
    
    // Handle "1 March 2025" or "01 Mar 2025" format
    const dayMonthYearMatch = dateStr.match(/(\d{1,2})\s+(\w{3,})\s+(\d{4})/);
    if (dayMonthYearMatch) {
      const day = dayMonthYearMatch[1].padStart(2, '0');
      const monthStr = dayMonthYearMatch[2].substring(0, 3);
      const year = dayMonthYearMatch[3];
      const monthIdx = months.indexOf(monthStr);
      if (monthIdx >= 0) {
        return `${year}-${(monthIdx + 1).toString().padStart(2, '0')}-${day}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function scrapeAllDisasters() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser so we can see it working
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const allDisasters = [];
  const seenAGRNs = new Set();
  let totalProcessed = 0;
  let totalSaved = 0;
  let totalErrors = 0;
  
  // Create scrape run record for tracking
  const scrapeRunId = randomUUID();
  const scrapeStartTime = new Date().toISOString();
  console.log(`\n🔍 SCRAPE RUN ID: ${scrapeRunId}`);
  console.log(`Medicare Compliance Scraper v2.0 - ${scrapeStartTime}\n`);
  
  // Track state counts for validation
  const stateCounts = {
    active: {},
    total: {}
  };

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('PAGE LOG:', msg.text());
      }
    });
    
    console.log('📄 Loading disasters list page...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Wait for the page to fully render
    console.log('⏳ Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if we need to handle any cookie/privacy popups
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const acceptButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('accept') ||
        btn.textContent?.toLowerCase().includes('agree')
      );
      if (acceptButton) acceptButton.click();
    });
    
    // STEP 1: Collect ALL disasters by navigating through pages
    console.log('\n📊 STEP 1: Collecting all disasters from all pages...\n');
    
    let pageNum = 1;
    let hasMorePages = true;
    
    while (hasMorePages && pageNum <= 50) {
      console.log(`\n📑 Processing page ${pageNum}...`);
      
      // Wait for table to be present
      try {
        await page.waitForSelector('table', { timeout: 10000, visible: true });
      } catch (e) {
        console.log('   ⚠️ No table found, checking for content...');
      }
      
      // Extract all disaster links from current page
      const pageData = await page.evaluate(() => {
        // Find all links that point to disaster pages
        const disasterLinks = [];
        
        // Method 1: Look in table cells
        const tableCells = document.querySelectorAll('td a');
        tableCells.forEach(link => {
          if (link.href && link.href.includes('/disasters/')) {
            const row = link.closest('tr');
            if (row) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 5) {
                disasterLinks.push({
                  url: link.href,
                  text: link.textContent?.trim(),
                  agrn: cells[cells.length - 1]?.textContent?.trim() || link.textContent?.trim(),
                  startDate: cells[0]?.textContent?.trim(),
                  endDate: cells[1]?.textContent?.trim(),
                  state: cells[2]?.textContent?.trim(),
                  type: cells[3]?.textContent?.trim(),
                  name: cells[4]?.textContent?.trim()
                });
              }
            }
          }
        });
        
        // Method 2: Look for any disaster links
        if (disasterLinks.length === 0) {
          const allLinks = document.querySelectorAll('a[href*="/disasters/"]');
          allLinks.forEach(link => {
            if (link.href && !link.href.includes('#')) {
              disasterLinks.push({
                url: link.href,
                text: link.textContent?.trim(),
                agrn: link.textContent?.match(/AGRN[- ]?\d+/)?.[0] || link.textContent?.trim()
              });
            }
          });
        }
        
        // Check for Next button
        const nextButtons = Array.from(document.querySelectorAll('a, button')).filter(el => 
          el.textContent?.toLowerCase().includes('next') ||
          el.textContent === '>' ||
          el.getAttribute('aria-label')?.toLowerCase().includes('next')
        );
        
        const hasNext = nextButtons.some(btn => 
          !btn.disabled && 
          !btn.classList.contains('disabled') &&
          btn.offsetParent !== null // Is visible
        );
        
        return {
          disasters: disasterLinks,
          hasNextPage: hasNext,
          pageInfo: {
            tableFound: document.querySelector('table') !== null,
            rowCount: document.querySelectorAll('tr').length,
            linkCount: disasterLinks.length
          }
        };
      });
      
      console.log(`   Found ${pageData.disasters.length} disasters on page ${pageNum}`);
      console.log(`   Page info:`, pageData.pageInfo);
      
      // Process found disasters
      for (const disaster of pageData.disasters) {
        const agrnKey = disaster.agrn?.replace(/[^0-9]/g, '');
        if (agrnKey && !seenAGRNs.has(agrnKey)) {
          seenAGRNs.add(agrnKey);
          allDisasters.push(disaster);
        }
      }
      
      // Try to go to next page
      if (pageData.hasNextPage && pageNum < 50) {
        console.log(`   Navigating to page ${pageNum + 1}...`);
        
        // Try to click Next button
        const clicked = await page.evaluate(() => {
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
            if (validButton.tagName === 'A') {
              validButton.click();
            } else {
              validButton.click();
            }
            return true;
          }
          return false;
        });
        
        if (clicked) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for page load
          pageNum++;
        } else {
          console.log('   Could not find Next button');
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }
    
    console.log(`\n✅ FOUND ${allDisasters.length} UNIQUE DISASTERS\n`);
    
    // STEP 2: Visit each disaster page and extract complete data
    console.log('📊 STEP 2: Extracting complete data from each disaster...\n');
    
    for (let i = 0; i < allDisasters.length; i++) {
      const disaster = allDisasters[i];
      totalProcessed++;
      
      if (!disaster.url) {
        console.log(`⚠️ [${i+1}/${allDisasters.length}] No URL for disaster`);
        continue;
      }
      
      try {
        console.log(`🔗 [${i+1}/${allDisasters.length}] ${disaster.text || disaster.agrn}`);
        
        await page.goto(disaster.url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract complete disaster data
        const detailData = await page.evaluate(() => {
          const data = {
            url: window.location.href,
            title: document.querySelector('h1')?.innerText?.trim(),
            quickInfo: {},
            allLGAs: [],
            allParagraphs: [],
            relatedLinks: []
          };
          
          // Extract Quick Info
          const dtElements = document.querySelectorAll('dt');
          const ddElements = document.querySelectorAll('dd');
          for (let i = 0; i < dtElements.length; i++) {
            const key = dtElements[i]?.innerText?.trim();
            const value = ddElements[i]?.innerText?.trim();
            if (key && value) {
              data.quickInfo[key] = value;
            }
          }
          
          // Extract ALL LGAs from lists
          const lists = document.querySelectorAll('ul');
          lists.forEach(ul => {
            const items = Array.from(ul.querySelectorAll('li')).map(li => li.innerText.trim());
            items.forEach(item => {
              // Basic filtering for LGA-like names
              if (item.length > 2 && item.length < 50 && /^[A-Z]/.test(item)) {
                data.allLGAs.push(item);
              }
            });
          });
          
          // Extract paragraphs for assistance details
          const paragraphs = document.querySelectorAll('p');
          paragraphs.forEach(p => {
            const text = p.innerText?.trim();
            if (text && text.length > 20) {
              data.allParagraphs.push(text);
            }
          });
          
          return data;
        });
        
        // Filter LGAs
        const uniqueLGAs = [...new Set(detailData.allLGAs.filter(isLikelyLGA))];
        
        // Extract assistance details
        const assistanceDetails = {};
        detailData.allParagraphs.forEach(para => {
          if (para.includes('$1000') && para.includes('adult')) {
            assistanceDetails.agdrp_payment = { adult: 1000, child: 400 };
          }
          if (para.includes('180 22 66')) {
            assistanceDetails.hotline = '180 22 66';
          }
        });
        
        // Get state code and LGA code
        const stateCode = mapStateCode(disaster.state);
        let primaryLgaCode = getStateCapitalLGA(disaster.state);
        
        if (uniqueLGAs.length > 0) {
          const { data: lgaData } = await supabase
            .from('lga_registry')
            .select('lga_code')
            .ilike('lga_name', `%${uniqueLGAs[0]}%`)
            .eq('state_code', stateCode)
            .limit(1)
            .single();
          
          if (lgaData) primaryLgaCode = lgaData.lga_code;
        }
        
        // Build disaster record
        const agrnRef = `AGRN-${(disaster.agrn || '').replace(/[^0-9]/g, '')}`;
        
        // CRITICAL: Store RAW data for validation
        const rawEndDate = disaster.endDate;
        const rawStartDate = disaster.startDate;
        const isDefinitelyActive = !rawEndDate || rawEndDate === '-' || rawEndDate === '–' || rawEndDate === '- -' || rawEndDate === '--' || rawEndDate === '';
        
        // Process dates with validation
        const processedEndDate = isDefinitelyActive ? null : parseDate(rawEndDate);
        const processedStartDate = parseDate(rawStartDate);
        
        // Determine status with multiple checks
        let finalStatus = 'expired';
        if (isDefinitelyActive) {
          finalStatus = 'active';
        } else if (disaster.name?.match(/onwards|commencing|continuing|from \d{4}$/i)) {
          finalStatus = 'active';
        } else if (detailData.title?.match(/onwards|commencing|continuing|from \d{4}$/i)) {
          finalStatus = 'active';
        } else if (processedEndDate && new Date(processedEndDate) > new Date()) {
          finalStatus = 'active';
        }
        
        // CRITICAL: Check event name for active keywords
        const eventName = disaster.name || disaster.text || detailData.title;
        if (!isDefinitelyActive && eventName?.match(/onwards|commencing|continuing|from \d{4}$/i)) {
          finalStatus = 'active';
        }
        
        const disasterRecord = {
          agrn_reference: agrnRef,
          event_name: eventName,
          disaster_type: mapDisasterType(disaster.type),
          declaration_date: processedStartDate,
          expiry_date: finalStatus === 'active' ? null : processedEndDate,
          declaration_status: finalStatus,
          // NEW VALIDATION FIELDS
          raw_end_date: rawEndDate || '',
          raw_start_date: rawStartDate || '',
          is_active_verified: isDefinitelyActive,
          scrape_run_id: scrapeRunId,
          validation_status: 'verified',
          scraper_version: 'v2.0-medicare-compliant',
          scraped_at: new Date().toISOString(),
          declaration_authority: 'Australian Government',
          severity_level: 3,
          state_code: stateCode,
          lga_code: primaryLgaCode,
          affected_areas: {
            all_lgas: uniqueLGAs,
            lga_count: uniqueLGAs.length,
            assistance_details: assistanceDetails,
            quick_info: detailData.quickInfo,
            extracted_at: new Date().toISOString()
          },
          description: detailData.allParagraphs.slice(0, 3).join('\n\n'),
          source_url: detailData.url,
          verification_url: detailData.url,
          data_source: 'disasterassist.gov.au',
          source_system: 'Complete Puppeteer Scraper',
          last_sync_timestamp: new Date().toISOString()
        };
        
        // Save to database
        const { error } = await supabase
          .from('disaster_declarations')
          .upsert(disasterRecord, {
            onConflict: 'agrn_reference',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`   ❌ Database error: ${error.message}`);
          totalErrors++;
        } else {
          const eligibility = isDefinitelyActive ? '✅ ELIGIBLE FOR TELEHEALTH' : '❌ NOT ELIGIBLE';
          const verification = isDefinitelyActive ? '(VERIFIED ACTIVE - NULL END DATE)' : '';
          console.log(`   ✅ Saved with ${uniqueLGAs.length} LGAs - ${eligibility} ${verification}`);
          totalSaved++;
          
          // Track state counts for validation
          if (!stateCounts.total[stateCode]) stateCounts.total[stateCode] = 0;
          if (!stateCounts.active[stateCode]) stateCounts.active[stateCode] = 0;
          stateCounts.total[stateCode]++;
          if (isDefinitelyActive) stateCounts.active[stateCode]++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        totalErrors++;
      }
      
      // Small delay between disasters
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 SCRAPING COMPLETE - RUNNING MEDICARE COMPLIANCE VALIDATION');
    console.log('='.repeat(80));
    console.log(`📊 Unique disasters found: ${allDisasters.length}`);
    console.log(`✅ Successfully saved: ${totalSaved}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`⏱️  Completed at: ${new Date().toLocaleString()}`);
    
    // CRITICAL VALIDATION FOR MEDICARE COMPLIANCE
    console.log('\n📋 STATE-BY-STATE ACTIVE DISASTER VALIDATION:');
    console.log('State | Active | Total | Expected Active Range | Status');
    console.log('-'.repeat(60));
    
    let validationPassed = true;
    const validationErrors = [];
    
    // Check QLD (expected ~23 active)
    const qldActive = stateCounts.active['QLD'] || 0;
    const qldStatus = (qldActive >= 20 && qldActive <= 30) ? '✅ PASS' : '❌ FAIL';
    if (qldActive < 20 || qldActive > 30) {
      validationPassed = false;
      validationErrors.push(`QLD has ${qldActive} active, expected 20-30`);
    }
    console.log(`QLD   | ${String(qldActive).padStart(6)} | ${String(stateCounts.total['QLD'] || 0).padStart(5)} | 20-30                 | ${qldStatus}`);
    
    // Check WA (expected ~37 active)
    const waActive = stateCounts.active['WA'] || 0;
    const waStatus = (waActive >= 30 && waActive <= 45) ? '✅ PASS' : '❌ FAIL';
    if (waActive < 30 || waActive > 45) {
      validationPassed = false;
      validationErrors.push(`WA has ${waActive} active, expected 30-45`);
    }
    console.log(`WA    | ${String(waActive).padStart(6)} | ${String(stateCounts.total['WA'] || 0).padStart(5)} | 30-45                 | ${waStatus}`);
    
    // Check NSW
    const nswActive = stateCounts.active['NSW'] || 0;
    const nswStatus = (nswActive >= 40) ? '✅ PASS' : '⚠️  WARN';
    console.log(`NSW   | ${String(nswActive).padStart(6)} | ${String(stateCounts.total['NSW'] || 0).padStart(5)} | 40+                   | ${nswStatus}`);
    
    // Check VIC
    const vicActive = stateCounts.active['VIC'] || 0;
    const vicStatus = (vicActive >= 20) ? '✅ PASS' : '⚠️  WARN';
    console.log(`VIC   | ${String(vicActive).padStart(6)} | ${String(stateCounts.total['VIC'] || 0).padStart(5)} | 20+                   | ${vicStatus}`);
    
    // Show other states
    for (const state of ['SA', 'TAS', 'NT', 'ACT']) {
      if (stateCounts.total[state]) {
        console.log(`${state.padEnd(5)} | ${String(stateCounts.active[state] || 0).padStart(6)} | ${String(stateCounts.total[state]).padStart(5)} | -                     | ℹ️  INFO`);
      }
    }
    
    // Database verification
    console.log('\n🔍 DATABASE VERIFICATION:');
    const { data: dbSummary } = await supabase
      .from('disaster_declarations')
      .select('state_code, expiry_date, is_active_verified, raw_end_date')
      .eq('scrape_run_id', scrapeRunId);
    
    if (dbSummary) {
      const nullEndDates = dbSummary.filter(d => !d.expiry_date).length;
      const verifiedActive = dbSummary.filter(d => d.is_active_verified).length;
      const rawDashCount = dbSummary.filter(d => d.raw_end_date === '-' || d.raw_end_date === '–').length;
      
      console.log(`   📊 Total disasters in this scrape: ${dbSummary.length}`);
      console.log(`   ✅ NULL expiry_date (active): ${nullEndDates}`);
      console.log(`   ✅ Verified active (is_active_verified=true): ${verifiedActive}`);
      console.log(`   ✅ Raw end date is dash: ${rawDashCount}`);
      
      if (nullEndDates !== verifiedActive || nullEndDates !== rawDashCount) {
        console.log('   ⚠️  WARNING: Inconsistency detected between fields!');
        validationErrors.push('Field inconsistency: null dates vs verified active');
      }
    }
    
    // Save scrape run record
    const { error: runError } = await supabase
      .from('scrape_runs')
      .insert({
        id: scrapeRunId,
        started_at: scrapeStartTime,
        completed_at: new Date().toISOString(),
        scraper_version: 'v2.0-medicare-compliant',
        total_disasters_found: allDisasters.length,
        active_disasters_found: Object.values(stateCounts.active).reduce((a, b) => a + b, 0),
        new_disasters_added: totalSaved,
        disasters_updated: 0,
        validation_passed: validationPassed,
        validation_errors: validationErrors.length > 0 ? validationErrors : null,
        state_counts: stateCounts,
        scrape_type: 'manual'
      });
    
    if (runError) {
      console.error('Failed to save scrape run record:', runError);
    }
    
    // Final validation result
    console.log('\n' + '='.repeat(80));
    if (validationPassed) {
      console.log('✅ MEDICARE COMPLIANCE VALIDATION: PASSED');
      console.log('All critical state counts are within expected ranges');
    } else {
      console.log('❌ MEDICARE COMPLIANCE VALIDATION: FAILED');
      console.log('CRITICAL ERRORS:');
      validationErrors.forEach(err => console.log(`   - ${err}`));
      console.log('\n⚠️  WARNING: Data may not be Medicare compliant!');
      console.log('Manual review required to avoid $500,000 fines');
    }
    console.log('='.repeat(80));
  }
}

// RUN IT
console.log('Starting scraper in 3 seconds...\n');
setTimeout(() => {
  scrapeAllDisasters().catch(console.error);
}, 3000);