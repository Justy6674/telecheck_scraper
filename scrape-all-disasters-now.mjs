#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🚀 FULL DISASTER IMPORT - Scraping ALL 760+ disasters from DisasterAssist\n');
console.log('⏱️  Estimated time: 30-45 minutes\n');

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

async function scrapeAllDisasters() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allDisasters = [];
  let totalProcessed = 0;
  let totalSaved = 0;
  let totalErrors = 0;

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    console.log('📄 Loading disasters list...');
    
    // STEP 1: Collect all disaster links from all pages
    console.log('\n📊 STEP 1: Collecting disaster links from all pages...\n');
    
    let currentPage = 0;
    let hasMorePages = true;
    
    while (hasMorePages && currentPage < 50) {
      const url = currentPage === 0 
        ? 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
        : `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page=${currentPage}`;
      
      console.log(`📑 Scraping page ${currentPage + 1}...`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for table to load
      try {
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
      } catch (e) {
        console.log(`   No table found on page ${currentPage + 1}`);
      }
      
      // Extract disasters from current page
      const pageDisasters = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        const disasters = [];
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            const link = cells[5]?.querySelector('a')?.href || cells[4]?.querySelector('a')?.href;
            if (link) {
              disasters.push({
                startDate: cells[0]?.textContent?.trim(),
                endDate: cells[1]?.textContent?.trim(),
                state: cells[2]?.textContent?.trim(),
                type: cells[3]?.textContent?.trim(),
                eventName: cells[4]?.textContent?.trim(),
                agrn: cells[5]?.textContent?.trim(),
                detailLink: link
              });
            }
          }
        });
        
        return disasters;
      });
      
      if (pageDisasters.length === 0) {
        console.log(`   No disasters found on page ${currentPage + 1}, ending pagination`);
        hasMorePages = false;
      } else {
        console.log(`   Found ${pageDisasters.length} disasters`);
        allDisasters.push(...pageDisasters);
        currentPage++;
      }
      
      // Small delay between pages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n✅ TOTAL DISASTERS FOUND: ${allDisasters.length}\n`);
    
    // STEP 2: Click into each disaster and extract complete data
    console.log('📊 STEP 2: Extracting complete data from each disaster...\n');
    
    for (let i = 0; i < allDisasters.length; i++) {
      const disaster = allDisasters[i];
      totalProcessed++;
      
      if (!disaster.detailLink || !disaster.agrn) {
        console.log(`⚠️  [${i+1}/${allDisasters.length}] Skipping - no link or AGRN`);
        continue;
      }
      
      try {
        console.log(`🔗 [${i+1}/${allDisasters.length}] Processing: ${disaster.eventName || disaster.agrn}`);
        
        await page.goto(disaster.detailLink, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Extract complete data
        const detailData = await page.evaluate(() => {
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
              data.allLists.push(items);
            }
          });
          
          // Paragraphs (assistance details)
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
        detailData.allLists.forEach(list => {
          list.forEach(item => {
            const cleaned = item.replace(/\(.*?\)/g, '').trim();
            if (isLikelyLGA(cleaned)) {
              allLGAs.add(cleaned);
            }
          });
        });
        
        const uniqueLGAs = Array.from(allLGAs);
        
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
        
        // Map state code
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
        const stateCode = stateMap[disaster.state] || 'NSW';
        
        // Get primary LGA code
        let primaryLgaCode = null;
        if (uniqueLGAs.length > 0) {
          const { data: lgaData } = await supabase
            .from('lga_registry')
            .select('lga_code')
            .ilike('lga_name', `%${uniqueLGAs[0]}%`)
            .eq('state_code', stateCode)
            .limit(1)
            .single();
          
          primaryLgaCode = lgaData?.lga_code;
        }
        
        // Use state capital if no LGA found
        if (!primaryLgaCode) {
          const capitals = {
            'NSW': '17200', 'VIC': '24600', 'QLD': '31000',
            'SA': '40070', 'WA': '57080', 'TAS': '62810',
            'NT': '71000', 'ACT': '89000'
          };
          primaryLgaCode = capitals[stateCode] || '17200';
        }
        
        // Build disaster record
        const disasterRecord = {
          agrn_reference: `AGRN-${disaster.agrn.replace(',', '')}`,
          event_name: disaster.eventName || detailData.title,
          disaster_type: disaster.type?.toLowerCase().includes('flood') ? 'flood' :
                        disaster.type?.toLowerCase().includes('fire') ? 'bushfire' :
                        disaster.type?.toLowerCase().includes('cyclone') ? 'cyclone' :
                        disaster.type?.toLowerCase().includes('storm') ? 'severe_storm' : 'other',
          declaration_date: parseDate(disaster.startDate),
          expiry_date: disaster.endDate ? parseDate(disaster.endDate) : null,
          declaration_status: 'active',
          declaration_authority: 'Australian Government', // FIXED: Added required field
          severity_level: 3,
          state_code: stateCode,
          lga_code: primaryLgaCode,
          affected_areas: {
            all_lgas: uniqueLGAs,
            lga_count: uniqueLGAs.length,
            assistance_details: assistanceDetails,
            quick_info: detailData.quickInfo,
            related_links: detailData.relatedLinks,
            extracted_at: new Date().toISOString()
          },
          description: detailData.allParagraphs.slice(0, 3).join('\n\n'),
          source_url: detailData.url,
          verification_url: detailData.url,
          data_source: 'disasterassist.gov.au',
          source_system: 'Full Import Scraper',
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
          console.log(`   ✅ Saved with ${uniqueLGAs.length} LGAs`);
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
    console.log(`📊 Total disasters found: ${allDisasters.length}`);
    console.log(`✅ Successfully saved: ${totalSaved}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`⏱️  Completed at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(80));
  }
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

// RUN THE FULL IMPORT
console.log('Starting in 3 seconds...\n');
setTimeout(() => {
  scrapeAllDisasters().catch(console.error);
}, 3000);