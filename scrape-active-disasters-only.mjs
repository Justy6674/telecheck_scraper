#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🔍 DAILY ACTIVE DISASTER RE-SCRAPER FOR MEDICARE COMPLIANCE\n');
console.log('Purpose: Check if any active disasters have ended\n');

async function rescrapeActiveDisasters() {
  const startTime = new Date();
  let changesDetected = 0;
  let endedDisasters = [];
  let lgaChanges = [];
  let errorsCount = 0;

  // Log activity start
  await supabase.from('disaster_activity_log').insert({
    activity_type: 'scrape_started',
    details: { type: 'active_only', reason: 'daily_check' }
  });

  try {
    // 1. Get all ACTIVE disasters (no end date)
    console.log('📋 Fetching active disasters from database...');
    const { data: activeDisasters, error } = await supabase
      .from('disaster_declarations')
      .select('*')
      .is('expiry_date', null);

    if (error) throw error;

    console.log(`Found ${activeDisasters.length} active disasters to check\n`);

    if (activeDisasters.length === 0) {
      console.log('No active disasters to check');
      return;
    }

    // 2. Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // 3. Check each active disaster
    for (let i = 0; i < activeDisasters.length; i++) {
      const disaster = activeDisasters[i];
      console.log(`[${i + 1}/${activeDisasters.length}] Checking: ${disaster.event_name}`);
      
      try {
        // Visit the disaster page
        await page.goto(disaster.source_url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract current data from the page
        const currentData = await page.evaluate(() => {
          const data = {
            title: document.querySelector('h1')?.innerText?.trim(),
            quickInfo: {},
            currentLGAs: [],
            endDate: null
          };

          // Check Quick Info for dates
          const dtElements = document.querySelectorAll('dt');
          const ddElements = document.querySelectorAll('dd');
          for (let i = 0; i < dtElements.length; i++) {
            const key = dtElements[i]?.innerText?.trim();
            const value = ddElements[i]?.innerText?.trim();
            if (key && value) {
              data.quickInfo[key] = value;
              // Look for end date indicators
              if (key.toLowerCase().includes('end') || key.toLowerCase().includes('expir')) {
                if (value && value !== 'N/A' && value !== '-') {
                  data.endDate = value;
                }
              }
            }
          }

          // Extract current LGAs
          const lists = document.querySelectorAll('ul');
          const lgaSet = new Set();
          lists.forEach(ul => {
            const items = Array.from(ul.querySelectorAll('li')).map(li => li.innerText.trim());
            items.forEach(item => {
              if (item.length > 2 && item.length < 50 && /^[A-Z]/.test(item)) {
                lgaSet.add(item);
              }
            });
          });
          data.currentLGAs = Array.from(lgaSet);

          // Check for ended status in text
          const bodyText = document.body.innerText.toLowerCase();
          if (bodyText.includes('this disaster has ended') || 
              bodyText.includes('assistance has ceased') ||
              bodyText.includes('no longer available')) {
            data.hasEndedText = true;
          }

          return data;
        });

        // 4. Check if disaster has ended
        if (currentData.endDate || currentData.hasEndedText) {
          console.log(`   ⚠️ DISASTER HAS ENDED! End date: ${currentData.endDate}`);
          
          // Parse the end date
          const endDate = parseDate(currentData.endDate);
          
          // Update the database
          const { error: updateError } = await supabase
            .from('disaster_declarations')
            .update({
              expiry_date: endDate,
              declaration_status: 'expired',
              last_sync_timestamp: new Date().toISOString()
            })
            .eq('agrn_reference', disaster.agrn_reference);

          if (updateError) {
            console.error(`   Error updating disaster: ${updateError.message}`);
            errorsCount++;
          } else {
            // Create critical alert
            const { error: alertError } = await supabase
              .from('disaster_status_changes')
              .insert({
                agrn_reference: disaster.agrn_reference,
                change_type: 'ended',
                previous_status: 'active',
                new_status: 'expired',
                previous_end_date: null,
                new_end_date: endDate,
                affected_lgas: disaster.affected_areas?.all_lgas || [],
                affected_postcodes: await getPostcodesForLGAs(disaster.affected_areas?.all_lgas || []),
                alert_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
              });

            if (!alertError) {
              endedDisasters.push({
                name: disaster.event_name,
                agrn: disaster.agrn_reference,
                endDate: endDate,
                lgas: disaster.affected_areas?.all_lgas || []
              });
              changesDetected++;
            }
          }
        } else {
          console.log(`   ✅ Still active`);
        }

        // 5. Check for LGA changes
        const previousLGAs = disaster.affected_areas?.all_lgas || [];
        const currentLGAs = filterLGAs(currentData.currentLGAs);
        
        const removedLGAs = previousLGAs.filter(lga => !currentLGAs.includes(lga));
        const addedLGAs = currentLGAs.filter(lga => !previousLGAs.includes(lga));

        if (removedLGAs.length > 0 || addedLGAs.length > 0) {
          console.log(`   📍 LGA changes detected!`);
          if (removedLGAs.length > 0) console.log(`      Removed: ${removedLGAs.join(', ')}`);
          if (addedLGAs.length > 0) console.log(`      Added: ${addedLGAs.join(', ')}`);

          // Update database with new LGAs
          const updatedAffectedAreas = {
            ...disaster.affected_areas,
            all_lgas: currentLGAs,
            lga_count: currentLGAs.length,
            last_lga_check: new Date().toISOString()
          };

          await supabase
            .from('disaster_declarations')
            .update({
              affected_areas: updatedAffectedAreas,
              last_sync_timestamp: new Date().toISOString()
            })
            .eq('agrn_reference', disaster.agrn_reference);

          // Create alerts for LGA changes
          if (removedLGAs.length > 0) {
            await supabase
              .from('disaster_status_changes')
              .insert({
                agrn_reference: disaster.agrn_reference,
                change_type: 'lga_removed',
                affected_lgas: removedLGAs,
                affected_postcodes: await getPostcodesForLGAs(removedLGAs),
                alert_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
              });

            lgaChanges.push({
              disaster: disaster.event_name,
              removed: removedLGAs
            });
            changesDetected++;
          }
        }

        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`   ❌ Error checking disaster: ${error.message}`);
        errorsCount++;
      }
    }

    await browser.close();

    // 6. Log activity completion
    await supabase.from('disaster_activity_log').insert({
      activity_type: 'scrape_completed',
      disasters_checked: activeDisasters.length,
      changes_found: changesDetected,
      ended_disasters: endedDisasters.length,
      details: {
        type: 'active_only',
        ended_disasters: endedDisasters,
        lga_changes: lgaChanges,
        duration_minutes: Math.round((new Date() - startTime) / 60000)
      }
    });

    // 7. Summary report
    console.log('\n' + '='.repeat(80));
    console.log('📊 ACTIVE DISASTER CHECK COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Disasters checked: ${activeDisasters.length}`);
    console.log(`🔄 Changes detected: ${changesDetected}`);
    console.log(`🔴 Disasters ended: ${endedDisasters.length}`);
    console.log(`📍 LGA changes: ${lgaChanges.length}`);
    console.log(`❌ Errors: ${errorsCount}`);
    console.log(`⏱️ Time taken: ${Math.round((new Date() - startTime) / 60000)} minutes`);

    // 8. Send alerts if disasters ended
    if (endedDisasters.length > 0) {
      console.log('\n🚨 CRITICAL ALERTS CREATED:');
      endedDisasters.forEach(d => {
        console.log(`   - ${d.name} (${d.agrn}) ended on ${d.endDate}`);
        console.log(`     Affected LGAs: ${d.lgas.length} areas`);
      });
      console.log('\n⚠️ All practitioners in affected areas will be notified');
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('Fatal error:', error);
    await supabase.from('disaster_activity_log').insert({
      activity_type: 'scrape_failed',
      details: { error: error.message }
    });
  }
}

// Helper function to filter LGAs
function filterLGAs(items) {
  const excludeList = [
    'Home', 'Contact', 'About', 'Help', 'Search', 'Menu',
    'Services Australia', 'Information publication scheme',
    'Emergency assistance', 'Recovery', 'Authority'
  ];
  
  return items.filter(item => {
    if (!item || item.length < 3 || item.length > 50) return false;
    if (excludeList.some(ex => item.toLowerCase().includes(ex.toLowerCase()))) return false;
    if (!/^[A-Z]/.test(item)) return false;
    return true;
  });
}

// Helper to parse dates
function parseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A') return null;
  
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
    
    // Handle "1 March 2025" format
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
    
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// Helper to get postcodes for LGAs
async function getPostcodesForLGAs(lgas) {
  if (!lgas || lgas.length === 0) return [];
  
  try {
    const { data } = await supabase
      .from('lga_postcode_mapping')
      .select('postcode')
      .in('lga_name', lgas);
    
    return data ? data.map(d => d.postcode) : [];
  } catch {
    return [];
  }
}

// Run the re-scraper
console.log('Starting active disaster check...\n');
rescrapeActiveDisasters().catch(console.error);