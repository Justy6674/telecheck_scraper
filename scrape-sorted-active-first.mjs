#!/usr/bin/env node

/**
 * OPTIMIZED SCRAPER - SORTS ACTIVE DISASTERS FIRST
 * 
 * Uses DisasterAssist's sorting feature to group all active (no end date) disasters first
 * This makes it much faster to identify all telehealth-eligible disasters
 * Perfect for the 3x per week re-scraping requirement
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🚀 OPTIMIZED SCRAPER - SORTING ACTIVE DISASTERS FIRST\n');
console.log('This version uses the sort feature to group all active disasters together\n');

async function scrapeWithSorting() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const scrapeRunId = randomUUID();
  const allDisasters = [];
  const seenAGRNs = new Set();
  let activeCount = 0;
  let expiredCount = 0;

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    
    console.log('📄 Loading disasters page...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // STEP 1: Click on the End Date column header to sort
    console.log('🔄 Clicking End Date column to sort (active disasters first)...');
    
    const sorted = await page.evaluate(() => {
      // Find the End Date column header
      const headers = Array.from(document.querySelectorAll('th'));
      const endDateHeader = headers.find(th => 
        th.textContent?.includes('End Date') || 
        th.textContent?.includes('End date')
      );
      
      if (endDateHeader) {
        // Check if it's a clickable header (has sort capability)
        const sortButton = endDateHeader.querySelector('button') || endDateHeader;
        sortButton.click();
        return true;
      }
      return false;
    });
    
    if (sorted) {
      console.log('   ✅ Clicked End Date header, waiting for sort...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Click again to ensure we have the right sort order (nulls first)
      await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('th'));
        const endDateHeader = headers.find(th => 
          th.textContent?.includes('End Date') || 
          th.textContent?.includes('End date')
        );
        if (endDateHeader) {
          const sortButton = endDateHeader.querySelector('button') || endDateHeader;
          sortButton.click();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('   ⚠️ Could not find sortable End Date column');
    }
    
    // STEP 2: Collect all disasters (now sorted with active first)
    console.log('\n📊 Collecting sorted disasters (active disasters should be first)...\n');
    
    let pageNum = 1;
    let hasMore = true;
    let foundFirstExpired = false;
    
    while (hasMore && pageNum <= 50) {
      console.log(`📑 Page ${pageNum}...`);
      
      const pageData = await page.evaluate(() => {
        const disasters = [];
        const rows = document.querySelectorAll('table tbody tr, table tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const link = row.querySelector('a[href*="/disasters/"]');
            if (link) {
              const endDateText = cells[1]?.textContent?.trim();
              disasters.push({
                url: link.href,
                startDate: cells[0]?.textContent?.trim(),
                endDate: endDateText,
                state: cells[2]?.textContent?.trim(),
                type: cells[3]?.textContent?.trim(),
                name: cells[4]?.textContent?.trim() || link.textContent?.trim(),
                agrn: link.textContent?.match(/AGRN[- ]?(\d+)/i)?.[1],
                isActive: !endDateText || endDateText === '-' || endDateText === '–' || endDateText === '- -'
              });
            }
          }
        });
        
        // Check for next button
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
      
      // Process disasters
      let pageActive = 0;
      let pageExpired = 0;
      
      for (const disaster of pageData.disasters) {
        const agrnKey = disaster.agrn || disaster.name;
        if (agrnKey && !seenAGRNs.has(agrnKey)) {
          seenAGRNs.add(agrnKey);
          allDisasters.push(disaster);
          
          if (disaster.isActive) {
            activeCount++;
            pageActive++;
          } else {
            expiredCount++;
            pageExpired++;
            if (!foundFirstExpired) {
              foundFirstExpired = true;
              console.log(`   🔍 Found first expired disaster on page ${pageNum}`);
            }
          }
        }
      }
      
      console.log(`   Found ${pageActive} active, ${pageExpired} expired disasters`);
      
      // Navigate to next page
      if (pageData.hasNext && pageNum < 50) {
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
            validButton.click();
            return true;
          }
          return false;
        });
        
        if (clicked) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          pageNum++;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 DISASTER COLLECTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total disasters found: ${allDisasters.length}`);
    console.log(`✅ Active (telehealth eligible): ${activeCount}`);
    console.log(`❌ Expired: ${expiredCount}`);
    
    // STEP 3: Now visit each active disaster for full details
    console.log('\n📋 PROCESSING ACTIVE DISASTERS FOR TELEHEALTH...\n');
    
    const activeDisasters = allDisasters.filter(d => d.isActive);
    let savedCount = 0;
    
    for (let i = 0; i < activeDisasters.length; i++) {
      const disaster = activeDisasters[i];
      
      try {
        console.log(`[${i+1}/${activeDisasters.length}] ${disaster.name} (${disaster.state})`);
        
        await page.goto(disaster.url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Extract full details
        const details = await page.evaluate(() => {
          const data = {
            title: document.querySelector('h1')?.innerText?.trim(),
            quickInfo: {},
            lgas: []
          };
          
          // Quick info
          document.querySelectorAll('dt').forEach((dt, idx) => {
            const dd = document.querySelectorAll('dd')[idx];
            if (dt && dd) {
              data.quickInfo[dt.textContent.trim()] = dd.textContent.trim();
            }
          });
          
          // LGAs
          document.querySelectorAll('ul li').forEach(li => {
            const text = li.textContent?.trim();
            if (text && text.length > 2 && text.length < 50 && /^[A-Z]/.test(text)) {
              data.lgas.push(text);
            }
          });
          
          return data;
        });
        
        // Save to database
        const record = {
          agrn_reference: `AGRN-${disaster.agrn || ''}`,
          event_name: disaster.name,
          disaster_type: disaster.type?.toLowerCase() || 'other',
          declaration_date: null, // Would parse if needed
          expiry_date: null, // NULL for active
          declaration_status: 'active',
          raw_end_date: disaster.endDate || '',
          is_active_verified: true,
          telehealth_eligible: true,
          scrape_run_id: scrapeRunId,
          state_code: disaster.state,
          lga_code: '00000',
          affected_areas: {
            all_lgas: details.lgas,
            lga_count: details.lgas.length,
            quick_info: details.quickInfo
          },
          source_url: disaster.url,
          data_source: 'disasterassist.gov.au',
          source_system: 'Optimized Sorted Scraper',
          last_sync_timestamp: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('disaster_declarations')
          .upsert(record, {
            onConflict: 'agrn_reference',
            ignoreDuplicates: false
          });
        
        if (!error) {
          savedCount++;
          console.log(`   ✅ Saved - ${details.lgas.length} LGAs affected`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
        
      } catch (err) {
        console.log(`   ❌ Failed: ${err.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TELEHEALTH ELIGIBILITY UPDATE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Active disasters processed: ${activeDisasters.length}`);
    console.log(`Successfully saved: ${savedCount}`);
    console.log('\nAll active disasters are now marked as telehealth eligible');
    console.log('Perfect for 3x weekly updates!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
console.log('Starting optimized scraper in 3 seconds...\n');
setTimeout(() => {
  scrapeWithSorting().catch(console.error);
}, 3000);