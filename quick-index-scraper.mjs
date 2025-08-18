#!/usr/bin/env node

/**
 * QUICK INDEX SCRAPER - Fast Table-Only Scan
 * 
 * Purpose: Rapidly collect disaster index from table view WITHOUT clicking into details
 * Used for: 3x weekly checks to detect changes
 * If changes detected: Triggers full detailed scrape
 * 
 * Collects: Start Date, End Date, State, Type, Name, AGRN
 * Saves to: disaster_index table for cross-reference
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('⚡ QUICK INDEX SCRAPER - Table-Only Fast Scan\n');
console.log('Collects disaster index WITHOUT visiting individual pages\n');
console.log('Perfect for 3x weekly change detection\n');

async function quickIndexScan() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const scanId = crypto.randomUUID();
  const scanStart = new Date();
  const disasters = [];
  let totalPages = 0;
  let changeDetected = false;

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    console.log('📄 Loading disasters list...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Wait longer for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Try to find table with more flexible selector
    try {
      await page.waitForSelector('table', { timeout: 10000, visible: true });
    } catch (e) {
      console.log('Note: Table not immediately visible, continuing...');
    }
    
    // Optional: Sort by end date to get active first
    console.log('🔄 Attempting to sort by End Date...');
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
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📊 Scanning all pages (table data only)...\n');
    
    let pageNum = 1;
    let hasMore = true;
    
    while (hasMore && pageNum <= 50) {
      process.stdout.write(`\rScanning page ${pageNum}...`);
      totalPages = pageNum;
      
      // Extract table data WITHOUT clicking into details
      const pageData = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr, table tr');
        const pageDisasters = [];
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const link = row.querySelector('a[href*="/disasters/"]');
            if (link) {
              // Extract AGRN from link text or last cell
              let agrn = link.textContent?.match(/AGRN[- ]?(\d+)/i)?.[1];
              if (!agrn) {
                agrn = cells[cells.length - 1]?.textContent?.match(/AGRN[- ]?(\d+)/i)?.[1];
              }
              
              const endDateText = cells[1]?.textContent?.trim();
              
              pageDisasters.push({
                start_date_raw: cells[0]?.textContent?.trim() || '',
                end_date_raw: endDateText || '',
                state: cells[2]?.textContent?.trim() || '',
                disaster_type: cells[3]?.textContent?.trim() || '',
                disaster_name: cells[4]?.textContent?.trim() || link.textContent?.trim() || '',
                agrn: agrn || '',
                url: link.href,
                // Quick active check
                is_active: !endDateText || endDateText === '-' || endDateText === '–' || endDateText === '- -' || endDateText === '--'
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
        
        return { disasters: pageDisasters, hasNext };
      });
      
      // Add to collection
      disasters.push(...pageData.disasters);
      
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
          await new Promise(resolve => setTimeout(resolve, 2000));
          pageNum++;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 INDEX SCAN COMPLETE');
    console.log('='.repeat(80));
    
    const scanEnd = new Date();
    const scanDuration = (scanEnd - scanStart) / 1000;
    
    // Statistics
    const activeCount = disasters.filter(d => d.is_active).length;
    const expiredCount = disasters.filter(d => !d.is_active).length;
    
    // State breakdown
    const stateBreakdown = {};
    disasters.forEach(d => {
      if (!stateBreakdown[d.state]) {
        stateBreakdown[d.state] = { total: 0, active: 0 };
      }
      stateBreakdown[d.state].total++;
      if (d.is_active) stateBreakdown[d.state].active++;
    });
    
    console.log(`Total disasters indexed: ${disasters.length}`);
    console.log(`✅ Active (telehealth eligible): ${activeCount}`);
    console.log(`❌ Expired: ${expiredCount}`);
    console.log(`Pages scanned: ${totalPages}`);
    console.log(`Scan time: ${scanDuration.toFixed(1)} seconds`);
    
    console.log('\n📍 STATE BREAKDOWN:');
    Object.entries(stateBreakdown).forEach(([state, counts]) => {
      console.log(`  ${state}: ${counts.active} active / ${counts.total} total`);
    });
    
    // Load previous index for comparison
    console.log('\n🔍 Checking for changes...');
    const { data: previousIndex } = await supabase
      .from('disaster_index')
      .select('agrn, end_date_raw, is_active')
      .order('agrn');
    
    if (previousIndex && previousIndex.length > 0) {
      const previousMap = new Map(previousIndex.map(d => [d.agrn, d]));
      const currentMap = new Map(disasters.map(d => [d.agrn, d]));
      
      // Check for new disasters
      const newDisasters = disasters.filter(d => !previousMap.has(d.agrn));
      
      // Check for status changes
      const statusChanges = [];
      disasters.forEach(d => {
        const prev = previousMap.get(d.agrn);
        if (prev && prev.is_active !== d.is_active) {
          statusChanges.push({
            agrn: d.agrn,
            name: d.disaster_name,
            old_status: prev.is_active ? 'active' : 'expired',
            new_status: d.is_active ? 'active' : 'expired'
          });
        }
      });
      
      // Check for removed disasters
      const removedDisasters = Array.from(previousMap.keys()).filter(agrn => !currentMap.has(agrn));
      
      if (newDisasters.length > 0 || statusChanges.length > 0 || removedDisasters.length > 0) {
        changeDetected = true;
        console.log('\n⚠️ CHANGES DETECTED:');
        
        if (newDisasters.length > 0) {
          console.log(`  📌 ${newDisasters.length} NEW disasters added`);
          newDisasters.slice(0, 5).forEach(d => {
            console.log(`     - ${d.disaster_name} (${d.state})`);
          });
          if (newDisasters.length > 5) {
            console.log(`     ... and ${newDisasters.length - 5} more`);
          }
        }
        
        if (statusChanges.length > 0) {
          console.log(`  🔄 ${statusChanges.length} status changes`);
          statusChanges.slice(0, 5).forEach(c => {
            console.log(`     - ${c.name}: ${c.old_status} → ${c.new_status}`);
          });
        }
        
        if (removedDisasters.length > 0) {
          console.log(`  ❌ ${removedDisasters.length} disasters removed`);
        }
      } else {
        console.log('  ✅ No changes detected since last scan');
      }
    } else {
      console.log('  ℹ️ First scan - no previous data to compare');
      changeDetected = true; // First scan should trigger full scrape
    }
    
    // Save to disaster_index table
    console.log('\n💾 Saving index to database...');
    
    // Clear old index
    await supabase.from('disaster_index').delete().neq('agrn', '');
    
    // Insert new index with scan metadata
    const indexRecords = disasters.map(d => ({
      ...d,
      scan_id: scanId,
      scanned_at: new Date().toISOString(),
      telehealth_eligible: d.is_active
    }));
    
    const { error } = await supabase
      .from('disaster_index')
      .insert(indexRecords);
    
    if (error) {
      console.error('Error saving index:', error.message);
    } else {
      console.log('  ✅ Index saved successfully');
    }
    
    // Save scan metadata
    const { error: scanError } = await supabase
      .from('index_scans')
      .insert({
        id: scanId,
        scan_type: 'quick_index',
        started_at: scanStart.toISOString(),
        completed_at: scanEnd.toISOString(),
        duration_seconds: scanDuration,
        total_disasters: disasters.length,
        active_disasters: activeCount,
        expired_disasters: expiredCount,
        changes_detected: changeDetected,
        state_breakdown: stateBreakdown
      });
    
    if (scanError) {
      console.error('Error saving scan metadata:', scanError.message);
    }
    
    // Recommendation
    console.log('\n' + '='.repeat(80));
    console.log('📋 RECOMMENDATION:');
    if (changeDetected) {
      console.log('  🚨 CHANGES DETECTED - FULL DETAIL SCRAPE RECOMMENDED');
      console.log('  Run: npm run scraper:production');
    } else {
      console.log('  ✅ NO CHANGES - No action needed');
      console.log('  Next scan scheduled in 2-3 days');
    }
    console.log('='.repeat(80));
    
    return { changeDetected, disasters: disasters.length, activeCount };
    
  } catch (error) {
    console.error('\n❌ Scan failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the scan
console.log('Starting quick index scan...\n');
quickIndexScan()
  .then(result => {
    process.exit(result.changeDetected ? 1 : 0); // Exit code 1 if changes detected
  })
  .catch(err => {
    console.error(err);
    process.exit(2);
  });