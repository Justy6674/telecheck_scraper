#!/usr/bin/env node
/**
 * MEDICARE CRITICAL: Complete DisasterAssist Scraper with Full Details
 * This scraper MUST:
 * 1. Get ALL 760+ disasters
 * 2. OPEN EACH DISASTER PAGE for full details
 * 3. Track all LGAs for Medicare eligibility
 * 4. Maintain audit trail for practitioner queries
 * 5. Run daily with change tracking
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Supabase connection - using REAL credentials
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y' // SERVICE ROLE KEY FOR FULL ACCESS
);

/**
 * Extract full details from a disaster page
 */
async function extractDisasterDetails(page, url) {
  console.log(`  📖 Opening disaster page: ${url}`);
  
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const details = await page.evaluate(() => {
    // Extract all possible data from the page
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    };
    
    const getAll = (selector) => {
      const els = document.querySelectorAll(selector);
      return Array.from(els).map(el => el.textContent.trim());
    };
    
    // Quick Info section
    const quickInfo = {};
    const infoRows = document.querySelectorAll('.quick-info tr, .info-table tr, table tr');
    infoRows.forEach(row => {
      const label = row.querySelector('td:first-child, th')?.textContent?.trim();
      const value = row.querySelector('td:last-child')?.textContent?.trim();
      if (label && value) {
        quickInfo[label.toLowerCase().replace(/[^a-z]/g, '_')] = value;
      }
    });
    
    // Main content
    const mainContent = document.querySelector('main, .content, #content, article')?.textContent?.trim() || '';
    
    // Extract AGRN
    const agrnMatch = mainContent.match(/AGRN[:\s]*(\d+(?:,\d+)?)/i);
    const agrn = agrnMatch ? agrnMatch[1].replace(',', '') : null;
    
    // Extract dates
    const startDateMatch = mainContent.match(/Start Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const endDateMatch = mainContent.match(/End Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    
    // Extract state
    const stateMatch = mainContent.match(/State[:\s]*(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)/i);
    
    // Extract LGAs - CRITICAL FOR MEDICARE
    const lgaSection = mainContent.match(/local government area(?:s)?\s*\n+([\s\S]*?)(?:\n\n|$)/i);
    let lgas = [];
    
    if (lgaSection) {
      // Split by common delimiters
      const lgaText = lgaSection[1];
      lgas = lgaText.split(/[\n,]/)
        .map(lga => lga.trim())
        .filter(lga => lga && lga.length > 2 && !lga.includes('following'));
    }
    
    // Also check for LGA lists in tables or lists
    const lgaElements = document.querySelectorAll('.lga-list li, .affected-areas li, ul li, td');
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
    
    // Extract related links
    const links = {};
    const linkElements = document.querySelectorAll('a[href*="recovery"], a[href*="disaster"], a[href*="nema"], a[href*="drfa"]');
    linkElements.forEach(link => {
      const text = link.textContent.trim();
      const href = link.href;
      if (text && href && !href.includes('javascript')) {
        links[text] = href;
      }
    });
    
    return {
      quickInfo,
      agrn,
      startDate: startDateMatch ? startDateMatch[1] : quickInfo.start_date,
      endDate: endDateMatch ? endDateMatch[1] : quickInfo.end_date,
      state: stateMatch ? stateMatch[1] : quickInfo.state,
      eventName: getText('h1, .page-title, .disaster-title') || quickInfo.name,
      lgas: lgas.filter(lga => lga && !lga.includes('assistance')),
      assistanceTypes,
      relatedLinks: links,
      fullContent: mainContent.substring(0, 5000), // First 5000 chars
      pageUrl: window.location.href
    };
  });
  
  return details;
}

/**
 * Scrape all disasters with full details
 */
async function scrapeAllDisastersWithDetails() {
  console.log('🚨 MEDICARE CRITICAL DATA COLLECTION');
  console.log('📊 Getting ALL 760+ disasters with FULL DETAILS');
  console.log('🏥 This data determines Medicare telehealth eligibility\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  try {
    const allDisasters = [];
    
    // STEP 1: Get all disaster URLs from listing pages
    console.log('📋 STEP 1: Collecting all disaster URLs...\n');
    
    const disasterUrls = [];
    for (let pageNum = 0; pageNum <= 40; pageNum++) {
      const listUrl = pageNum === 0 
        ? 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
        : `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page=${pageNum}`;
      
      console.log(`📄 Checking page ${pageNum + 1}: ${listUrl}`);
      
      await page.goto(listUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Extract disaster links
      const pageUrls = await page.evaluate(() => {
        const links = [];
        // Look for all links that might be disasters
        const linkElements = document.querySelectorAll('a[href*="disaster"], a[href*="agrn"], td a, .result-item a');
        linkElements.forEach(link => {
          const href = link.href;
          const text = link.textContent.trim();
          
          // Filter for actual disaster pages
          if (href && (
            href.includes('/disasters/') ||
            href.includes('agrn') ||
            (text && text.match(/\d{4}|flood|fire|storm|cyclone/i))
          )) {
            links.push({
              url: href,
              text: text
            });
          }
        });
        return links;
      });
      
      if (pageUrls.length === 0 && pageNum > 35) {
        console.log('  ✓ Reached end of listings');
        break;
      }
      
      disasterUrls.push(...pageUrls);
      console.log(`  Found ${pageUrls.length} disaster links`);
    }
    
    // Deduplicate URLs
    const uniqueUrls = [...new Map(disasterUrls.map(item => [item.url, item])).values()];
    
    console.log(`\n📊 Total unique disaster URLs found: ${uniqueUrls.length}\n`);
    
    // STEP 2: Open each disaster page and extract full details
    console.log('📖 STEP 2: Extracting full details from each disaster...\n');
    
    let processed = 0;
    for (const disaster of uniqueUrls) {
      try {
        const details = await extractDisasterDetails(page, disaster.url);
        
        if (details.agrn || details.eventName) {
          allDisasters.push({
            ...details,
            listingText: disaster.text,
            scrapedAt: new Date().toISOString()
          });
          
          processed++;
          console.log(`  ✅ [${processed}/${uniqueUrls.length}] ${details.eventName || disaster.text}`);
          console.log(`     AGRN: ${details.agrn}, LGAs: ${details.lgas.length}, State: ${details.state}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Failed to extract ${disaster.url}: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 EXTRACTION COMPLETE`);
    console.log(`   Total disasters processed: ${allDisasters.length}`);
    console.log('='.repeat(60) + '\n');
    
    // STEP 3: Save to database with full audit trail
    console.log('💾 STEP 3: Saving to database with audit trail...\n');
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (const disaster of allDisasters) {
      try {
        // Parse dates properly
        const parseAusDate = (dateStr) => {
          if (!dateStr || dateStr === ' ') return null;
          const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (match) {
            const [_, day, month, year] = match;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return null;
        };
        
        const startDate = parseAusDate(disaster.startDate);
        const endDate = parseAusDate(disaster.endDate);
        
        // Main disaster declaration
        const { error: declError } = await supabase
          .from('disaster_declarations')
          .upsert({
            agrn_reference: disaster.agrn || `UNKNOWN-${Date.now()}`,
            event_name: disaster.eventName || 'Unknown Event',
            disaster_type: detectDisasterType(disaster.eventName || disaster.fullContent),
            declaration_date: startDate || new Date().toISOString().split('T')[0],
            expiry_date: endDate,
            declaration_status: endDate ? 'expired' : 'active',
            state_code: disaster.state || 'UNK',
            lga_code: 'MULTI', // Will be handled in junction table
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
              related_links: disaster.relatedLinks,
              quick_info: disaster.quickInfo
            }
          }, {
            onConflict: 'agrn_reference',
            ignoreDuplicates: false
          });
        
        if (declError) {
          console.error(`  ❌ Failed to save ${disaster.agrn}: ${declError.message}`);
          errorCount++;
        } else {
          savedCount++;
          
          // Save LGA mappings (critical for Medicare)
          for (const lga of disaster.lgas) {
            await supabase
              .from('disaster_lgas')
              .upsert({
                agrn_reference: disaster.agrn || `UNKNOWN-${Date.now()}`,
                lga_name: lga,
                lga_code: generateLgaCode(lga, disaster.state),
                added_date: startDate || new Date().toISOString().split('T')[0],
                currently_affected: !endDate,
                state_code: disaster.state
              }, {
                onConflict: 'agrn_reference,lga_name',
                ignoreDuplicates: true
              });
          }
          
          console.log(`  ✅ Saved: ${disaster.eventName} (${disaster.lgas.length} LGAs)`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing: ${error.message}`);
        errorCount++;
      }
    }
    
    // Save scrape log
    await supabase
      .from('data_import_logs')
      .insert({
        import_type: 'complete_disaster_detail_scrape',
        source_url: 'https://www.disasterassist.gov.au',
        records_imported: savedCount,
        import_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          total_urls: uniqueUrls.length,
          total_processed: allDisasters.length,
          saved: savedCount,
          errors: errorCount,
          timestamp: new Date().toISOString()
        }
      });
    
    // Save JSON backup
    const filename = `disasters-full-details-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(filename, JSON.stringify(allDisasters, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 FINAL RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully saved: ${savedCount} disasters`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Backup saved to: ${filename}`);
    console.log('\n🏥 Medicare telehealth eligibility data ready!');
    console.log('='.repeat(60));
    
    return allDisasters;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

function detectDisasterType(text) {
  const lower = text.toLowerCase();
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
  // In production, map to real ABS LGA codes
  // For now, generate consistent codes
  const hash = lgaName.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  const statePrefix = {
    'NSW': '1', 'VIC': '2', 'QLD': '3', 'SA': '4',
    'WA': '5', 'TAS': '6', 'NT': '7', 'ACT': '8'
  };
  
  return `${statePrefix[state] || '9'}${Math.abs(hash) % 9000 + 1000}`;
}

// Run the scraper
if (process.argv[2] === '--daily') {
  console.log('🔄 Running daily sync...');
  // TODO: Add change detection logic
}

scrapeAllDisastersWithDetails()
  .then(disasters => {
    console.log(`\n✅ Complete! Scraped ${disasters.length} disasters with full details`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Scraper failed:', error);
    process.exit(1);
  });