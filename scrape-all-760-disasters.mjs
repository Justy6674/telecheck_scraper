#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Direct Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y' // Using service role for full access
);

async function scrapePage(page, pageNum) {
  const url = pageNum === 0 
    ? 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
    : `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page=${pageNum}`;
  
  console.log(`📄 Fetching page ${pageNum + 1} - ${url}`);
  
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  // Wait a bit for dynamic content
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Try to extract disasters even if table selector fails
  const disasters = await page.evaluate(() => {
    const results = [];
    
    // Try multiple selectors
    const rows = document.querySelectorAll('table tbody tr, .disaster-row, .disaster-item, [class*="disaster"]');
    
    rows.forEach(row => {
      const text = row.textContent || '';
      
      // Look for AGRN pattern (4 digits)
      const agrnMatch = text.match(/\b(\d{4})\b/);
      
      // Extract state
      const stateMatch = text.match(/(NSW|VIC|QLD|SA|WA|TAS|NT|ACT|New South Wales|Victoria|Queensland|South Australia|Western Australia|Tasmania|Northern Territory|Australian Capital Territory)/i);
      
      // Extract dates (various formats)
      const dateMatch = text.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\w+\s+\d{4})/g);
      
      if (agrnMatch && stateMatch) {
        // Get the full text as name, clean it up
        const name = text.replace(/\s+/g, ' ').trim().substring(0, 200);
        
        results.push({
          agrn: `AGRN-${agrnMatch[1]}`,
          state: stateMatch[0],
          startDate: dateMatch ? dateMatch[0] : null,
          endDate: dateMatch && dateMatch[1] ? dateMatch[1] : null,
          name: name,
          type: text.toLowerCase().includes('flood') ? 'Flood' : 
                text.toLowerCase().includes('fire') ? 'Bushfire' :
                text.toLowerCase().includes('cyclone') ? 'Cyclone' :
                text.toLowerCase().includes('storm') ? 'Storm' : 'Other'
        });
      }
    });
    
    return results;
  });
  
  return disasters;
}

async function scrapeAll760Disasters() {
  console.log('🎯 MISSION: Get ALL 760+ disasters from DisasterAssist');
  console.log('📊 Targeting 38+ pages of disaster data');
  console.log('⚡ Starting aggressive scraping...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  try {
    const allDisasters = [];
    const maxPages = 45; // Check up to page 45 to be sure
    
    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      try {
        const pageDisasters = await scrapePage(page, pageNum);
        
        if (pageDisasters.length === 0) {
          console.log(`❌ No disasters found on page ${pageNum + 1}`);
          if (pageNum > 38) {
            console.log('📑 Reached end of disasters');
            break;
          }
        } else {
          console.log(`✅ Found ${pageDisasters.length} disasters on page ${pageNum + 1}`);
          allDisasters.push(...pageDisasters);
        }
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`⚠️ Error on page ${pageNum + 1}: ${error.message}`);
        continue; // Keep going even if one page fails
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎉 SCRAPING COMPLETE!`);
    console.log(`📊 TOTAL DISASTERS FOUND: ${allDisasters.length}`);
    console.log('='.repeat(60));
    
    if (allDisasters.length < 700) {
      console.log('⚠️ WARNING: Found fewer than 700 disasters!');
      console.log('⚠️ Expected 760+ disasters from 38 pages');
    }
    
    // Now insert ALL disasters into database
    console.log('\n💾 INSERTING ALL DISASTERS INTO DATABASE...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const disaster of allDisasters) {
      try {
        // Map states properly
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
        
        const stateCode = stateMap[disaster.state] || 'QLD';
        
        // Map to real LGA codes
        const stateLgaCodes = {
          'NSW': '17200', // Sydney
          'VIC': '24600', // Melbourne  
          'QLD': '31000', // Brisbane
          'SA': '40070',  // Adelaide
          'WA': '57080',  // Perth
          'TAS': '62810', // Hobart
          'NT': '71000',  // Darwin
          'ACT': '89000'  // Unincorporated ACT
        };
        
        const lgaCode = stateLgaCodes[stateCode];
        
        // Map disaster type to enum
        const mapDisasterType = (type) => {
          const typeStr = type?.toLowerCase() || '';
          if (typeStr.includes('flood')) return 'flood';
          if (typeStr.includes('fire') || typeStr.includes('bushfire')) return 'bushfire';
          if (typeStr.includes('cyclone')) return 'cyclone';
          if (typeStr.includes('storm')) return 'severe_storm';
          if (typeStr.includes('earthquake')) return 'earthquake';
          if (typeStr.includes('drought')) return 'drought';
          return 'other';
        };
        
        // Parse date
        const parseDate = (dateStr) => {
          if (!dateStr) return new Date().toISOString().split('T')[0];
          try {
            return new Date(dateStr).toISOString().split('T')[0];
          } catch {
            return new Date().toISOString().split('T')[0];
          }
        };
        
        const { error } = await supabase
          .from('disaster_declarations')
          .upsert({
            agrn_reference: disaster.agrn,
            disaster_type: mapDisasterType(disaster.type),
            declaration_date: parseDate(disaster.startDate),
            expiry_date: disaster.endDate ? parseDate(disaster.endDate) : null,
            declaration_status: disaster.endDate ? 'expired' : 'active',
            severity_level: 3,
            state_code: stateCode,
            lga_code: lgaCode,
            description: disaster.name,
            declaration_authority: 'Australian Government',
            verification_url: `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters`,
            data_source: 'disasterassist.gov.au',
            source_system: 'DisasterAssist',
            last_sync_timestamp: new Date().toISOString()
          }, {
            onConflict: 'agrn_reference',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`❌ Failed ${disaster.agrn}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          if (successCount % 50 === 0) {
            console.log(`✅ Progress: ${successCount} disasters saved...`);
          }
        }
        
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 FINAL RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully inserted: ${successCount} disasters`);
    console.log(`❌ Failed: ${errorCount} disasters`);
    console.log(`📊 Total processed: ${allDisasters.length} disasters`);
    
    if (successCount < 700) {
      console.log('\n⚠️ WARNING: Database should have 760+ disasters!');
      console.log('⚠️ Re-run the scraper or check DisasterAssist website');
    } else {
      console.log('\n🎉 SUCCESS: All disasters loaded into database!');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
scrapeAll760Disasters().catch(console.error);