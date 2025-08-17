#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Direct Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMDIxNjksImV4cCI6MjA3MDg3ODE2OX0.n13n8_i2QhQr2msNNEDuQ1YwDLy7D12YMFkYLpPwgME'
);

async function scrapeAllDisasters() {
  console.log('🚀 Starting FULL DisasterAssist scrape with Puppeteer...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser so you can see it working
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to DisasterAssist
    console.log('📄 Loading DisasterAssist page...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 30000 });
    
    let allDisasters = [];
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages && currentPage <= 50) { // Max 50 pages for safety
      console.log(`\n📄 Scraping page ${currentPage}...`);
      
      // Wait for table to be present
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      
      // Extract disasters from current page
      const pageDisasters = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        const disasters = [];
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const startDate = cells[0]?.textContent?.trim();
            const endDate = cells[1]?.textContent?.trim();
            const state = cells[2]?.textContent?.trim();
            const type = cells[3]?.textContent?.trim();
            const nameCell = cells[4];
            const nameLink = nameCell?.querySelector('a');
            const name = nameLink?.textContent?.trim() || nameCell?.textContent?.trim();
            const href = nameLink?.href;
            const agrnCell = cells[5];
            const agrnText = agrnCell?.textContent?.trim();
            
            if (name && agrnText) {
              disasters.push({
                startDate: startDate === '--' ? null : startDate,
                endDate: endDate === '--' ? null : endDate,
                state,
                type,
                name,
                url: href,
                agrn: agrnText
              });
            }
          }
        });
        
        return disasters;
      });
      
      console.log(`✅ Found ${pageDisasters.length} disasters on page ${currentPage}`);
      allDisasters = allDisasters.concat(pageDisasters);
      
      // Check for next page
      let nextButton = null;
      try {
        nextButton = await page.$('a[rel="next"]') || 
                     await page.$('.pagination-next:not(.disabled)') ||
                     await page.$('a[title="Next"]');
      } catch (e) {
        // Try simpler selector
        const links = await page.$$('a');
        for (const link of links) {
          const text = await link.evaluate(el => el.textContent);
          if (text && text.includes('Next')) {
            nextButton = link;
            break;
          }
        }
      }
      
      if (nextButton) {
        // Click next page
        await nextButton.click();
        await page.waitForTimeout(2000); // Wait for page to load
        currentPage++;
      } else {
        console.log('📑 No more pages found');
        hasMorePages = false;
      }
    }
    
    console.log(`\n🎯 TOTAL DISASTERS FOUND: ${allDisasters.length}`);
    
    // Show sample
    console.log('\n📝 First 10 disasters:');
    allDisasters.slice(0, 10).forEach(d => {
      console.log(`  - ${d.name} (${d.agrn}) - ${d.state} - ${d.startDate || 'Ongoing'}`);
    });
    
    // Insert into database
    console.log('\n💾 Inserting ALL disasters into database...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const disaster of allDisasters) {
      try {
        // Parse dates
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr === '--' || dateStr === 'Ongoing') return null;
          try {
            // Handle formats like "Jul 2025" or "31 July 2025"
            const parts = dateStr.split(' ');
            if (parts.length === 2) {
              // Format: "Jul 2025"
              const monthYear = new Date(`01 ${dateStr}`);
              return monthYear.toISOString().split('T')[0];
            } else if (parts.length === 3) {
              // Format: "31 July 2025"
              const fullDate = new Date(dateStr);
              return fullDate.toISOString().split('T')[0];
            }
            return new Date(dateStr).toISOString().split('T')[0];
          } catch {
            return null;
          }
        };
        
        const startDate = parseDate(disaster.startDate);
        const endDate = parseDate(disaster.endDate);
        
        // Map states
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
        
        // Map disaster type to valid enum value
        const mapDisasterType = (type) => {
          const typeStr = type?.toLowerCase() || '';
          if (typeStr.includes('flood')) return 'flood';
          if (typeStr.includes('fire') || typeStr.includes('bushfire')) return 'bushfire';
          if (typeStr.includes('cyclone')) return 'cyclone';
          if (typeStr.includes('storm')) return 'severe_storm';
          if (typeStr.includes('earthquake')) return 'earthquake';
          if (typeStr.includes('drought')) return 'drought';
          if (typeStr.includes('heatwave')) return 'heatwave';
          if (typeStr.includes('landslide')) return 'landslide';
          if (typeStr.includes('tsunami')) return 'tsunami';
          return 'other';
        };
        
        // Get real LGA code for the state - use major city LGA codes
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
        
        const lgaCode = stateLgaCodes[stateCode] || '31000'; // Default to Brisbane if unknown
        
        // Insert or update
        const { error } = await supabase
          .from('disaster_declarations')
          .insert({
            agrn_reference: disaster.agrn,
            disaster_type: mapDisasterType(disaster.type),
            declaration_date: startDate || new Date().toISOString().split('T')[0],
            expiry_date: endDate,
            declaration_status: endDate ? 'expired' : 'active',
            severity_level: 3,
            state_code: stateCode,
            lga_code: lgaCode,
            description: disaster.name,
            declaration_authority: 'Australian Government',
            verification_url: disaster.url || `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters`,
            data_source: 'disasterassist.gov.au',
            source_system: 'DisasterAssist'
          });
        
        if (error) {
          console.error(`❌ Failed ${disaster.agrn}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Saved: ${disaster.agrn} - ${disaster.name}`);
          successCount++;
        }
        
      } catch (err) {
        console.error(`❌ Error processing ${disaster.agrn}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SCRAPING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully inserted: ${successCount} disasters`);
    console.log(`❌ Failed: ${errorCount} disasters`);
    console.log(`📊 Total processed: ${allDisasters.length} disasters`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  } finally {
    await browser.close();
  }
}

// Run it
scrapeAllDisasters().catch(console.error);