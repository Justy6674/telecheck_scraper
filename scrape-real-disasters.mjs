#!/usr/bin/env node
/**
 * REAL DISASTER SCRAPER - Properly parse DisasterAssist table
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

async function scrapeRealDisasters() {
  console.log('🚨 SCRAPING REAL DISASTER DATA FROM DISASTERASSIST\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    const allDisasters = [];
    
    // Scrape multiple pages
    for (let pageNum = 0; pageNum <= 5; pageNum++) {
      const url = pageNum === 0 
        ? 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
        : `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page=${pageNum}`;
      
      console.log(`📄 Page ${pageNum + 1}: ${url}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Parse the table correctly
      const pageDisasters = await page.evaluate(() => {
        const results = [];
        const rows = document.querySelectorAll('table tbody tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            // The table structure is:
            // Col 0: Start Date
            // Col 1: End Date  
            // Col 2: State
            // Col 3: Disaster Type
            // Col 4: Event Name
            // Col 5: AGRN
            
            const startDate = cells[0]?.textContent?.trim() || '';
            const endDate = cells[1]?.textContent?.trim() || '';
            const state = cells[2]?.textContent?.trim() || '';
            const disasterType = cells[3]?.textContent?.trim() || '';
            const eventName = cells[4]?.textContent?.trim() || '';
            const agrn = cells[5]?.textContent?.trim() || '';
            const link = row.querySelector('a')?.href || '';
            
            if (agrn && eventName) {
              results.push({
                agrn: `AGRN-${agrn}`,
                eventName: eventName,
                startDate: startDate,
                endDate: endDate === '-' ? null : endDate,
                state: state,
                disasterType: disasterType,
                detailUrl: link
              });
            }
          }
        });
        
        return results;
      });
      
      console.log(`  Found ${pageDisasters.length} disasters`);
      allDisasters.push(...pageDisasters);
      
      if (pageDisasters.length === 0) break;
    }
    
    console.log(`\n✅ TOTAL DISASTERS FOUND: ${allDisasters.length}\n`);
    
    // Save to database
    console.log('💾 SAVING TO DATABASE...\n');
    
    let saved = 0;
    let errors = 0;
    
    for (const disaster of allDisasters) {
      try {
        // Parse dates
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr === '-') return null;
          const months = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const match = dateStr.match(/(\w+)\s+(\d{4})/);
          if (match) {
            const month = months[match[1]] || '01';
            return `${match[2]}-${month}-01`;
          }
          return null;
        };
        
        // Map state to code
        const stateMap = {
          'New South Wales': 'NSW',
          'Victoria': 'VIC',
          'Queensland': 'QLD',
          'South Australia': 'SA',
          'Western Australia': 'WA',
          'Tasmania': 'TAS',
          'Northern Territory': 'NT',
          'Australian Capital Territory': 'ACT',
          'Multi-state': 'NSW'
        };
        
        const stateCode = stateMap[disaster.state] || 'NSW';
        
        // Map disaster type
        const typeMap = {
          'Flood': 'flood',
          'Storm': 'severe_storm',
          'Flood, Storm': 'flood',
          'Bushfire': 'bushfire',
          'Cyclone': 'cyclone',
          'Earthquake': 'earthquake',
          'Drought': 'drought'
        };
        
        const disasterTypeEnum = typeMap[disaster.disasterType] || 'other';
        
        const { error } = await supabase
          .from('disaster_declarations')
          .upsert({
            agrn_reference: disaster.agrn,
            event_name: disaster.eventName,
            disaster_type: disasterTypeEnum,
            declaration_date: parseDate(disaster.startDate) || '2025-01-01',
            expiry_date: parseDate(disaster.endDate),
            declaration_status: disaster.endDate ? 'expired' : 'active',
            state_code: stateCode,
            lga_code: '31000', // Will be updated when we scrape details
            description: disaster.eventName,
            declaration_authority: 'Australian Government',
            verification_url: disaster.detailUrl,
            source_url: disaster.detailUrl,
            data_source: 'disasterassist.gov.au',
            source_system: 'DisasterAssist',
            last_sync_timestamp: new Date().toISOString()
          }, {
            onConflict: 'agrn_reference',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`❌ Error ${disaster.agrn}: ${error.message}`);
          errors++;
        } else {
          saved++;
          console.log(`✅ Saved: ${disaster.agrn} - ${disaster.eventName}`);
        }
        
      } catch (err) {
        console.error(`❌ Error processing ${disaster.agrn}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS:');
    console.log(`✅ Successfully saved: ${saved} disasters`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    
    // Verify what's in the database
    const { data: dbDisasters, count } = await supabase
      .from('disaster_declarations')
      .select('*', { count: 'exact', head: false })
      .order('declaration_date', { ascending: false })
      .limit(10);
    
    console.log(`\n📊 DATABASE NOW HAS ${count} TOTAL DISASTERS`);
    console.log('\nMost recent disasters:');
    dbDisasters?.forEach(d => {
      console.log(`  ${d.agrn_reference}: ${d.event_name} (${d.state_code}) - ${d.declaration_status}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
scrapeRealDisasters().catch(console.error);