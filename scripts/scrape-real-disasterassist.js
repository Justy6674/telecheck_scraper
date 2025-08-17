#!/usr/bin/env node

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local file
config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfbohkqmykagkdmggcxw.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMDIxNjksImV4cCI6MjA3MDg3ODE2OX0.n13n8_i2QhQr2msNNEDuQ1YwDLy7D12YMFkYLpPwgME';

console.log('🔗 Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeDisasterAssist() {
  console.log('🚀 Starting REAL DisasterAssist scraping...');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000 
  });
  
  const page = await browser.newPage();
  
  try {
    // Go to the exact page you showed me
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('📄 Page loaded, waiting for table...');
    
    // Wait for the table to be visible
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Get ALL disasters from the table
    const disasters = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const disasterList = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          // Extract data from each cell
          const startDate = cells[0]?.textContent?.trim();
          const endDate = cells[1]?.textContent?.trim();
          const stateTerritory = cells[2]?.textContent?.trim();
          const disasterType = cells[3]?.textContent?.trim();
          const nameLink = cells[4]?.querySelector('a');
          const name = nameLink?.textContent?.trim();
          const agrnText = cells[5]?.textContent?.trim();
          
          // Extract AGRN number
          const agrnMatch = agrnText?.match(/\d+/);
          const agrn = agrnMatch ? agrnMatch[0] : null;
          
          if (name && agrn) {
            disasterList.push({
              startDate: startDate || 'Ongoing',
              endDate: endDate === '--' ? null : endDate,
              state: stateTerritory,
              disasterType,
              name,
              agrn: `AGRN-${agrn}`,
              url: nameLink?.href || `https://www.disasterassist.gov.au/find-a-disaster/disaster/${agrn}`
            });
          }
        }
      });
      
      return disasterList;
    });
    
    console.log(`✅ Found ${disasters.length} disasters on current page`);
    
    // Check if there are more pages
    let pageNum = 1;
    let hasNextPage = true;
    
    while (hasNextPage && pageNum < 10) { // Limit to 10 pages for safety
      try {
        // Look for next page button
        const nextButton = await page.$('a[rel="next"], button:has-text("Next"), .pagination-next');
        
        if (nextButton) {
          console.log(`📄 Loading page ${pageNum + 1}...`);
          await nextButton.click();
          await page.waitForTimeout(2000);
          
          // Scrape this page too
          const moreDisasters = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            const disasterList = [];
            
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 5) {
                const startDate = cells[0]?.textContent?.trim();
                const endDate = cells[1]?.textContent?.trim();
                const stateTerritory = cells[2]?.textContent?.trim();
                const disasterType = cells[3]?.textContent?.trim();
                const nameLink = cells[4]?.querySelector('a');
                const name = nameLink?.textContent?.trim();
                const agrnText = cells[5]?.textContent?.trim();
                
                const agrnMatch = agrnText?.match(/\d+/);
                const agrn = agrnMatch ? agrnMatch[0] : null;
                
                if (name && agrn) {
                  disasterList.push({
                    startDate: startDate || 'Ongoing',
                    endDate: endDate === '--' ? null : endDate,
                    state: stateTerritory,
                    disasterType,
                    name,
                    agrn: `AGRN-${agrn}`,
                    url: nameLink?.href || `https://www.disasterassist.gov.au/find-a-disaster/disaster/${agrn}`
                  });
                }
              }
            });
            
            return disasterList;
          });
          
          disasters.push(...moreDisasters);
          console.log(`✅ Found ${moreDisasters.length} more disasters (total: ${disasters.length})`);
          pageNum++;
        } else {
          hasNextPage = false;
        }
      } catch (e) {
        console.log('No more pages found');
        hasNextPage = false;
      }
    }
    
    console.log(`\n🎯 TOTAL DISASTERS FOUND: ${disasters.length}`);
    console.log('\n📝 Sample disasters:');
    disasters.slice(0, 5).forEach(d => {
      console.log(`  - ${d.name} (${d.agrn}) - ${d.state} - ${d.startDate}`);
    });
    
    // Now insert into database
    console.log('\n💾 Inserting into database...');
    
    for (const disaster of disasters) {
      try {
        // Parse dates
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr === 'Ongoing') return null;
          // Parse format like "Jul 2025" or "31 July 2025"
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date.toISOString();
        };
        
        const startDate = parseDate(disaster.startDate);
        const endDate = parseDate(disaster.endDate);
        
        // Map state codes
        const stateMap = {
          'New South Wales': 'NSW',
          'Victoria': 'VIC',
          'Queensland': 'QLD',
          'South Australia': 'SA',
          'Western Australia': 'WA',
          'Tasmania': 'TAS',
          'Northern Territory': 'NT',
          'Australian Capital Territory': 'ACT'
        };
        
        const stateCode = stateMap[disaster.state] || disaster.state;
        
        // Insert disaster declaration
        const { error } = await supabase
          .from('disaster_declarations')
          .upsert({
            agrn_reference: disaster.agrn,
            disaster_type: disaster.disasterType?.toLowerCase() || 'other',
            declaration_date: startDate || new Date().toISOString(),
            expiry_date: endDate,
            declaration_status: endDate ? 'expired' : 'active',
            severity_level: 3, // Default severity
            state_code: stateCode,
            description: disaster.name,
            declaration_authority: 'Australian Government',
            verification_url: disaster.url,
            data_source: 'disasterassist.gov.au',
            source_system: 'DisasterAssist'
          }, {
            onConflict: 'agrn_reference'
          });
        
        if (error) {
          console.error(`Failed to insert ${disaster.agrn}:`, error);
        } else {
          console.log(`✅ Inserted: ${disaster.agrn} - ${disaster.name}`);
        }
        
      } catch (e) {
        console.error(`Error processing disaster ${disaster.agrn}:`, e);
      }
    }
    
    console.log('\n🎉 SCRAPING COMPLETE!');
    console.log(`Total disasters in database: ${disasters.length}`);
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeDisasterAssist().catch(console.error);