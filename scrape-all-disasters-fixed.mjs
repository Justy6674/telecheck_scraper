#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🚀 SMART DISASTER SCRAPER - DisasterAssist.gov.au\n');
console.log('Features: Duplicate detection, smart re-crawl, proper pagination\n');

// Check if this is a re-crawl or initial run
const isReCrawl = process.argv.includes('--recrawl');

// Helper to check if text is likely an LGA name
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
    // Added exclusions for non-LGA items
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
  
  // Exclude if contains these keywords
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
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null;
  
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
    
    // If no match, return null instead of today's date
    return null;
  } catch {
    return null;
  }
}

async function scrapeAllDisasters() {
  const browser = await puppeteer.launch({
    headless: 'new', // Run headless for speed
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const allDisasters = [];
  const seenAGRNs = new Set();
  let totalProcessed = 0;
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // STEP 0: If re-crawl, load existing disasters with end dates
    const existingDisastersWithEndDates = new Set();
    if (isReCrawl) {
      console.log('📋 Loading existing disasters with end dates to skip...\n');
      const { data: existing } = await supabase
        .from('disaster_declarations')
        .select('agrn_reference')
        .not('expiry_date', 'is', null);
      
      if (existing) {
        existing.forEach(d => existingDisastersWithEndDates.add(d.agrn_reference));
        console.log(`   Will skip ${existingDisastersWithEndDates.size} disasters with end dates\n`);
      }
    }
    
    // STEP 1: Collect ALL unique disasters from ALL pages
    console.log('📊 STEP 1: Collecting disasters from all pages...\n');
    
    // First navigate to the main page
    console.log('📑 Loading main disasters page...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages && currentPage <= 50) { // Max 50 pages as safety limit
      try {
        console.log(`\n📑 Processing page ${currentPage}...`);
        
        // Wait for the page to fully load and table to appear
        await new Promise(resolve => setTimeout(resolve, 8000)); // Give more time for JS to run
        
        // Debug: Check what's on the page
        const pageContent = await page.evaluate(() => {
          const tables = document.querySelectorAll('table');
          const links = document.querySelectorAll('a[href*="disasters"]');
          return {
            tablesFound: tables.length,
            tableClasses: Array.from(tables).map(t => t.className),
            disasterLinksFound: links.length,
            firstFiveLinks: Array.from(links).slice(0, 5).map(a => ({
              text: a.textContent?.trim(),
              href: a.href
            }))
          };
        });
        
        console.log('   Page analysis:', JSON.stringify(pageContent, null, 2));
        
        // Wait for the table with class="table" to be visible
        try {
          await page.waitForSelector('table.table', { 
            visible: true,
            timeout: 15000 
          });
          console.log('   Table found and visible');
        } catch (e) {
          console.log('   Warning: Could not wait for table.table');
          // Still continue to try extracting
        }
        
        // Extract disasters from this page
        const pageDisasters = await page.evaluate(() => {
          // Use the correct selector - table with class="table"
          let rows = document.querySelectorAll('table.table tbody tr');
          if (rows.length === 0) {
            rows = document.querySelectorAll('table.table tr'); // Try without tbody
          }
          if (rows.length === 0) {
            rows = document.querySelectorAll('.table tbody tr'); // Try just class
          }
          if (rows.length === 0) {
            rows = document.querySelectorAll('table tbody tr'); // Try generic table
          }
          
          const disasters = [];
          console.log(`Found ${rows.length} table rows`);
          
          rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            
            // Skip header rows
            if (cells.length === 0) return;
            
            // Log first row to understand structure
            if (index === 0) {
              console.log(`First row has ${cells.length} cells`);
              Array.from(cells).forEach((cell, i) => {
                console.log(`Cell ${i}: ${cell.textContent?.trim()?.substring(0, 50)}`);
              });
            }
            
            // Handle both 6-cell and 5-cell formats
            if (cells.length >= 5) {
              // Find the link - it's usually in the last cell with text
              let link = null;
              let agrn = null;
              
              // Check last cell for link and AGRN
              const lastCell = cells[cells.length - 1];
              const lastCellLink = lastCell?.querySelector('a');
              if (lastCellLink) {
                link = lastCellLink.href;
                agrn = lastCellLink.textContent?.trim();
              }
              
              // If no link in last cell, check second to last
              if (!link && cells.length > 5) {
                const secondLastCell = cells[cells.length - 2];
                const secondLastLink = secondLastCell?.querySelector('a');
                if (secondLastLink) {
                  link = secondLastLink.href;
                  agrn = cells[cells.length - 1]?.textContent?.trim(); // AGRN in last cell
                }
              }
              
              if (link && agrn) {
                disasters.push({
                  startDate: cells[0]?.textContent?.trim(),
                  endDate: cells[1]?.textContent?.trim(),
                  state: cells[2]?.textContent?.trim(),
                  type: cells[3]?.textContent?.trim(),
                  eventName: cells[4]?.textContent?.trim() || cells[3]?.textContent?.trim(),
                  agrn: agrn,
                  detailLink: link
                });
              }
            }
          });
          
          console.log(`Extracted ${disasters.length} disasters from page`);
          return disasters;
        });
        
        if (pageDisasters.length === 0) {
          console.log(`   No disasters found on page ${currentPage + 1} - end of listings`);
          break;
        }
        
        // Check for duplicates (indicates we've looped back to page 1)
        let newDisastersOnPage = 0;
        for (const disaster of pageDisasters) {
          const agrnKey = `AGRN-${disaster.agrn?.replace(',', '')}`;
          if (!seenAGRNs.has(agrnKey)) {
            seenAGRNs.add(agrnKey);
            
            // Skip if re-crawl and has end date
            if (isReCrawl && existingDisastersWithEndDates.has(agrnKey)) {
              console.log(`   Skipping ${agrnKey} (has end date)`);
              totalSkipped++;
            } else {
              allDisasters.push(disaster);
              newDisastersOnPage++;
            }
          }
        }
        
        console.log(`   ✅ Found ${pageDisasters.length} disasters, ${newDisastersOnPage} new`);
        console.log(`   Total unique so far: ${allDisasters.length}`);
        
        // If no new disasters, we might have reached the end
        if (newDisastersOnPage === 0 && currentPage > 1) {
          console.log(`   No new disasters on page ${currentPage} - may have reached the end`);
          hasMorePages = false;
          break;
        }
        
        // Try to find and click the Next button to go to next page
        const nextButtonExists = await page.evaluate(() => {
          // Look for pagination controls
          const nextLinks = Array.from(document.querySelectorAll('a')).filter(a => 
            a.textContent?.toLowerCase().includes('next') ||
            a.textContent?.includes('>')
          );
          
          const nextButton = nextLinks.find(link => {
            // Check if it's not disabled
            return !link.classList.contains('disabled') && 
                   !link.hasAttribute('disabled') &&
                   link.href && 
                   !link.href.includes('#');
          });
          
          if (nextButton) {
            nextButton.click();
            return true;
          }
          
          // Also check for numbered pagination
          const pageNumbers = Array.from(document.querySelectorAll('.pagination a, .pager a'));
          const currentPageNum = parseInt(document.querySelector('.pagination .active')?.textContent || '1');
          const nextPageLink = pageNumbers.find(a => {
            const pageNum = parseInt(a.textContent || '0');
            return pageNum === currentPageNum + 1;
          });
          
          if (nextPageLink) {
            nextPageLink.click();
            return true;
          }
          
          return false;
        });
        
        if (!nextButtonExists) {
          console.log(`   No Next button found - reached last page`);
          hasMorePages = false;
        } else {
          console.log(`   Clicked Next button, waiting for page to load...`);
          currentPage++;
          // Wait for navigation
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.log(`   ⚠️ Error on page ${currentPage}: ${error.message}`);
        hasMorePages = false;
      }
    }
    
    console.log(`\n✅ UNIQUE DISASTERS FOUND: ${allDisasters.length}\n`);
    console.log(`   Skipped ${totalSkipped} disasters with end dates\n`);
    
    // STEP 2: Click into each disaster and extract data
    console.log('📊 STEP 2: Extracting complete data from each disaster...\n');
    
    for (let i = 0; i < allDisasters.length; i++) {
      const disaster = allDisasters[i];
      totalProcessed++;
      
      if (!disaster.detailLink || !disaster.agrn) {
        console.log(`⚠️ [${i+1}/${allDisasters.length}] Skipping - no link or AGRN`);
        continue;
      }
      
      try {
        console.log(`🔗 [${i+1}/${allDisasters.length}] ${disaster.eventName || disaster.agrn}`);
        
        await page.goto(disaster.detailLink, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Extract complete data
        const completeData = await page.evaluate(() => {
          const data = {
            url: window.location.href,
            title: document.querySelector('h1')?.innerText?.trim(),
            quickInfo: {},
            allLists: [],
            allParagraphs: [],
            relatedLinks: [],
            fullText: document.body.innerText
          };
          
          // Quick Info
          const dtElements = document.querySelectorAll('dt');
          const ddElements = document.querySelectorAll('dd');
          for (let i = 0; i < dtElements.length; i++) {
            const key = dtElements[i]?.innerText?.trim();
            const value = ddElements[i]?.innerText?.trim();
            if (key && value) {
              data.quickInfo[key] = value;
            }
          }
          
          // All lists (where LGAs are)
          const lists = document.querySelectorAll('ul');
          lists.forEach(ul => {
            const items = Array.from(ul.querySelectorAll('li')).map(li => li.innerText.trim());
            if (items.length > 0) {
              data.allLists.push({
                items,
                looksLikeLGAs: items.length > 5 && items.every(item => 
                  item.length < 50 && !item.includes('http') && /^[A-Z]/.test(item)
                )
              });
            }
          });
          
          // Paragraphs
          const paragraphs = document.querySelectorAll('p');
          paragraphs.forEach(p => {
            const text = p.innerText?.trim();
            if (text && text.length > 20) {
              data.allParagraphs.push(text);
            }
          });
          
          // Related links
          const links = document.querySelectorAll('a');
          links.forEach(a => {
            const text = a.innerText?.trim();
            const href = a.href;
            if (text && href && !href.includes('javascript') && 
                (text.includes('Authority') || text.includes('Services') || text.includes('Department'))) {
              data.relatedLinks.push({ text, url: href });
            }
          });
          
          return data;
        });
        
        // Extract unique LGAs
        const allLGAs = new Set();
        completeData.allLists.forEach(list => {
          if (list.looksLikeLGAs || list.items.some(item => isLikelyLGA(item))) {
            list.items.forEach(item => {
              const cleaned = item.replace(/\(.*?\)/g, '').trim();
              if (isLikelyLGA(cleaned)) {
                allLGAs.add(cleaned);
              }
            });
          }
        });
        
        const uniqueLGAs = Array.from(allLGAs);
        
        // Extract assistance details
        const assistanceDetails = {};
        completeData.allParagraphs.forEach(para => {
          if (para.includes('$1000') && para.includes('adult')) {
            assistanceDetails.agdrp_payment = { adult: 1000, child: 400 };
          }
          if (para.includes('180 22 66')) {
            assistanceDetails.hotline = '180 22 66';
          }
        });
        
        // Lookup primary LGA code
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
        
        // Build record
        const disasterRecord = {
          agrn_reference: `AGRN-${disaster.agrn.replace(',', '')}`,
          event_name: disaster.eventName || completeData.title,
          disaster_type: mapDisasterType(disaster.type),
          declaration_date: parseDate(disaster.startDate),
          expiry_date: parseDate(disaster.endDate),
          declaration_status: disaster.endDate ? 'expired' : 'active',
          declaration_authority: 'Australian Government',
          severity_level: 3,
          state_code: stateCode,
          lga_code: primaryLgaCode,
          affected_areas: {
            all_lgas: uniqueLGAs,
            lga_count: uniqueLGAs.length,
            assistance_details: assistanceDetails,
            quick_info: completeData.quickInfo,
            related_links: completeData.relatedLinks,
            extracted_at: new Date().toISOString()
          },
          description: completeData.allParagraphs.slice(0, 3).join('\n\n'),
          source_url: completeData.url,
          verification_url: completeData.url,
          data_source: 'disasterassist.gov.au',
          source_system: 'Smart Scraper v2',
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
          const eligibility = disaster.endDate ? 'NOT ELIGIBLE' : 'ELIGIBLE FOR TELEHEALTH';
          console.log(`   ✅ Saved with ${uniqueLGAs.length} LGAs - ${eligibility}`);
          totalSaved++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        totalErrors++;
      }
      
      // Small delay between disasters
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 IMPORT COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Unique disasters found: ${allDisasters.length}`);
    console.log(`✅ Successfully saved: ${totalSaved}`);
    console.log(`⏭️  Skipped (has end date): ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`⏱️  Completed at: ${new Date().toLocaleString()}`);
    
    // Show telehealth eligibility summary
    const { data: summary } = await supabase
      .from('disaster_declarations')
      .select('expiry_date');
    
    if (summary) {
      const eligible = summary.filter(d => !d.expiry_date).length;
      const notEligible = summary.filter(d => d.expiry_date).length;
      console.log('\n📊 TELEHEALTH ELIGIBILITY:');
      console.log(`   ✅ Eligible (no end date): ${eligible}`);
      console.log(`   ❌ Not eligible (has end date): ${notEligible}`);
    }
    
    console.log('='.repeat(80));
  }
}

// RUN IT
scrapeAllDisasters().catch(console.error);