#!/usr/bin/env node
/**
 * QUICK SCRAPER - Get REAL disaster data NOW
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// REAL Supabase credentials
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

async function quickScrape() {
  console.log('🚀 GETTING REAL DISASTER DATA FROM DISASTERASSIST...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    // Go to DisasterAssist
    console.log('📄 Loading DisasterAssist website...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot to see what we're dealing with
    await page.screenshot({ path: 'disasterassist-page.png' });
    console.log('📸 Screenshot saved as disasterassist-page.png');
    
    // Try to extract disasters from the page
    const disasters = await page.evaluate(() => {
      const results = [];
      
      // Try table rows first
      const rows = document.querySelectorAll('table tbody tr');
      console.log(`Found ${rows.length} table rows`);
      
      if (rows.length > 0) {
        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            results.push({
              rowNum: index + 1,
              agrn: cells[0]?.textContent?.trim() || '',
              eventName: cells[1]?.textContent?.trim() || '',
              dates: cells[2]?.textContent?.trim() || '',
              lgas: cells[3]?.textContent?.trim() || '',
              state: cells[4]?.textContent?.trim() || '',
              status: cells[5]?.textContent?.trim() || 'Active',
              url: row.querySelector('a')?.href || ''
            });
          }
        });
      }
      
      // If no table, try any disaster-looking content
      if (results.length === 0) {
        const allText = document.body.innerText;
        const agrnMatches = allText.match(/AGRN[:\s]*\d+/gi) || [];
        const floodMatches = allText.match(/\w+\s+(?:flood|bushfire|cyclone|storm)/gi) || [];
        
        results.push({
          info: 'Page content found',
          agrnCount: agrnMatches.length,
          disasterMentions: floodMatches.length,
          sampleText: allText.substring(0, 500)
        });
      }
      
      return results;
    });
    
    console.log(`\n✅ Found ${disasters.length} items on first page`);
    console.log('Sample data:', JSON.stringify(disasters.slice(0, 3), null, 2));
    
    // If we found real disasters, save them
    if (disasters.length > 0 && disasters[0].agrn) {
      console.log('\n💾 SAVING REAL DISASTERS TO DATABASE...\n');
      
      for (const disaster of disasters.slice(0, 10)) { // Save first 10 as test
        if (disaster.agrn && disaster.eventName) {
          console.log(`Saving: ${disaster.agrn} - ${disaster.eventName}`);
          
          const { error } = await supabase
            .from('disaster_declarations')
            .upsert({
              agrn_reference: disaster.agrn || `TEST-${Date.now()}`,
              event_name: disaster.eventName || 'Unknown Event',
              disaster_type: disaster.eventName?.toLowerCase().includes('flood') ? 'flood' : 
                            disaster.eventName?.toLowerCase().includes('fire') ? 'bushfire' : 'other',
              declaration_date: new Date().toISOString().split('T')[0],
              declaration_status: 'active',
              state_code: disaster.state || 'QLD',
              lga_code: '31000', // Brisbane as default
              description: `${disaster.eventName} - ${disaster.lgas || 'Multiple areas'}`,
              declaration_authority: 'Australian Government',
              verification_url: disaster.url || 'https://www.disasterassist.gov.au',
              data_source: 'disasterassist.gov.au',
              source_system: 'DisasterAssist',
              last_sync_timestamp: new Date().toISOString()
            }, {
              onConflict: 'agrn_reference',
              ignoreDuplicates: false
            });
          
          if (error) {
            console.error(`❌ Error saving ${disaster.agrn}:`, error.message);
          } else {
            console.log(`✅ Saved ${disaster.agrn}`);
          }
        }
      }
    }
    
    // Check what's in the database now
    const { data: savedDisasters, error } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, event_name, declaration_status')
      .limit(10);
    
    console.log('\n📊 DATABASE STATUS:');
    console.log(`Found ${savedDisasters?.length || 0} disasters in database`);
    if (savedDisasters && savedDisasters.length > 0) {
      console.log('Sample disasters:');
      savedDisasters.forEach(d => {
        console.log(`  - ${d.agrn_reference}: ${d.event_name} (${d.declaration_status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

// Run it
quickScrape().catch(console.error);