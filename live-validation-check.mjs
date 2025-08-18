#!/usr/bin/env node

/**
 * LIVE VALIDATION CHECK
 * 
 * Continuously monitors and compares Puppeteer vs Playwright data
 * CRITICAL: If data doesn't match EXACTLY, we're fucked ($500k fines)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🔍 LIVE VALIDATION CHECK - DATA MUST BE IDENTICAL\n');

async function liveCheck() {
  while (true) {
    // Get counts from both scrapers
    const { data: puppeteerData } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, is_active_verified, raw_end_date, state_code')
      .eq('scraper_version', 'v2.0-medicare-compliant')
      .order('agrn_reference');

    const { data: playwrightData } = await supabase
      .from('test_disaster_declarations')
      .select('agrn_reference, is_active_verified, raw_end_date, state_code')
      .eq('scraper_version', 'playwright-validation-v1.0')
      .order('agrn_reference');

    const puppeteerCount = puppeteerData?.length || 0;
    const playwrightCount = playwrightData?.length || 0;

    // Count active disasters
    const puppeteerActive = puppeteerData?.filter(d => d.is_active_verified).length || 0;
    const playwrightActive = playwrightData?.filter(d => d.is_active_verified).length || 0;

    // Count NULL end dates
    const puppeteerNulls = puppeteerData?.filter(d => 
      ['', '-', '–', '- -', '--'].includes(d.raw_end_date)
    ).length || 0;
    const playwrightNulls = playwrightData?.filter(d => 
      ['', '-', '–', '- -', '--'].includes(d.raw_end_date)
    ).length || 0;

    // State counts
    const puppeteerStates = {};
    const playwrightStates = {};
    
    puppeteerData?.forEach(d => {
      if (d.is_active_verified) {
        puppeteerStates[d.state_code] = (puppeteerStates[d.state_code] || 0) + 1;
      }
    });
    
    playwrightData?.forEach(d => {
      if (d.is_active_verified) {
        playwrightStates[d.state_code] = (playwrightStates[d.state_code] || 0) + 1;
      }
    });

    // Display comparison
    console.clear();
    console.log('🔍 LIVE VALIDATION CHECK - ' + new Date().toLocaleTimeString());
    console.log('='.repeat(70));
    
    console.log('\n📊 DISASTER COUNTS:');
    console.log(`  Puppeteer:  ${puppeteerCount} disasters`);
    console.log(`  Playwright: ${playwrightCount} disasters`);
    console.log(`  Status: ${puppeteerCount === playwrightCount ? '✅ MATCHED' : '❌ MISMATCH!'}`);
    
    console.log('\n✅ ACTIVE DISASTERS (Telehealth Eligible):');
    console.log(`  Puppeteer:  ${puppeteerActive} active`);
    console.log(`  Playwright: ${playwrightActive} active`);
    console.log(`  Status: ${puppeteerActive === playwrightActive ? '✅ MATCHED' : '❌ MISMATCH!'}`);
    
    console.log('\n📅 NULL END DATES:');
    console.log(`  Puppeteer:  ${puppeteerNulls} null dates`);
    console.log(`  Playwright: ${playwrightNulls} null dates`);
    console.log(`  Status: ${puppeteerNulls === playwrightNulls ? '✅ MATCHED' : '❌ MISMATCH!'}`);
    
    console.log('\n🗺️ STATE ACTIVE COUNTS:');
    const allStates = new Set([...Object.keys(puppeteerStates), ...Object.keys(playwrightStates)]);
    let stateMismatch = false;
    
    allStates.forEach(state => {
      const pCount = puppeteerStates[state] || 0;
      const plCount = playwrightStates[state] || 0;
      const match = pCount === plCount;
      if (!match) stateMismatch = true;
      console.log(`  ${state}: Puppeteer=${pCount}, Playwright=${plCount} ${match ? '✅' : '❌'}`);
    });

    // CRITICAL CHECK - QLD and WA
    const qldMatch = (puppeteerStates['QLD'] || 0) === (playwrightStates['QLD'] || 0);
    const waMatch = (puppeteerStates['WA'] || 0) === (playwrightStates['WA'] || 0);
    
    console.log('\n⚠️ CRITICAL STATE VALIDATION:');
    console.log(`  QLD: ${qldMatch ? '✅ MATCHED' : '❌ MISMATCH - MEDICARE RISK!'}`);
    console.log(`  WA:  ${waMatch ? '✅ MATCHED' : '❌ MISMATCH - MEDICARE RISK!'}`);

    // Overall status
    const allMatched = 
      puppeteerCount === playwrightCount &&
      puppeteerActive === playwrightActive &&
      puppeteerNulls === playwrightNulls &&
      !stateMismatch;

    console.log('\n' + '='.repeat(70));
    if (allMatched) {
      console.log('✅ ALL DATA MATCHES - SAFE FOR MEDICARE');
    } else {
      console.log('❌ DATA MISMATCH DETECTED - $500,000 FINE RISK!');
      console.log('STOP THE SCRAPERS AND FIX IMMEDIATELY!');
    }
    console.log('='.repeat(70));
    
    console.log('\nPress Ctrl+C to stop monitoring...');
    console.log('Next check in 10 seconds...');
    
    // Wait 10 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

// Run continuous monitoring
liveCheck().catch(console.error);