#!/usr/bin/env node

/**
 * TELECHECK DUAL SCRAPER VALIDATOR
 * Critical Medicare compliance system that ensures both scrapers produce identical results
 * Monitors for active disasters (NULL end dates) which are eligible for telehealth billing
 * $500,000 fine risk if this fails - MUST BE 100% ACCURATE
 */

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);

// Initialize Supabase clients for separate databases
const supabaseMain = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfbohkqmykagkdmggcxw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Separate tables for each scraper to ensure independence
const PUPPETEER_TABLE = 'disaster_declarations';
const PLAYWRIGHT_TABLE = 'disaster_declarations_validation';

// Map column names between tables
const COLUMN_MAP = {
  puppeteer: {
    id: 'agrn_reference',
    name: 'event_name',
    type: 'disaster_type',
    state: 'state_code', 
    start_date: 'declaration_date',
    end_date: 'expiry_date',
    raw_end: 'raw_end_date',
    lgas: 'postcodes'
  },
  playwright: {
    id: 'agrn',
    name: 'name',
    type: 'type',
    state: 'state_code',
    start_date: 'start_date',
    end_date: 'end_date',
    raw_end: 'end_date',
    lgas: 'affected_lgas'
  }
};

console.log('🚨 MEDICARE COMPLIANCE VALIDATOR STARTED');
console.log('💰 Risk: $500,000 fine if validation fails');
console.log('✅ Requirement: 100% accuracy on active disasters (no end date)');
console.log('🔄 Validating both scrapers produce identical results\n');

// Critical validation function
async function validateScraperData() {
  console.log('\n' + '='.repeat(80));
  console.log('⚡ STARTING CRITICAL VALIDATION RUN - ' + new Date().toISOString());
  console.log('='.repeat(80));

  try {
    // Step 1: Run Puppeteer scraper
    console.log('\n📊 [1/4] Running Puppeteer scraper...');
    const puppeteerStart = Date.now();
    const { stdout: puppeteerOut, stderr: puppeteerErr } = await execAsync('node scrape-all-disasters-puppeteer.mjs');
    const puppeteerTime = Date.now() - puppeteerStart;
    
    if (puppeteerErr && !puppeteerErr.includes('Warning')) {
      throw new Error(`Puppeteer scraper error: ${puppeteerErr}`);
    }
    console.log(`✅ Puppeteer completed in ${puppeteerTime}ms`);

    // Step 2: Run Playwright scraper
    console.log('\n📊 [2/4] Running Playwright validation scraper...');
    const playwrightStart = Date.now();
    const { stdout: playwrightOut, stderr: playwrightErr } = await execAsync('node validation-scraper-playwright.mjs');
    const playwrightTime = Date.now() - playwrightStart;
    
    if (playwrightErr && !playwrightErr.includes('Warning')) {
      throw new Error(`Playwright scraper error: ${playwrightErr}`);
    }
    console.log(`✅ Playwright completed in ${playwrightTime}ms`);

    // Step 3: Compare data from both scrapers
    console.log('\n🔍 [3/4] Comparing scraper results...');
    
    // Get Puppeteer data
    const { data: puppeteerData, error: puppeteerDbError } = await supabaseMain
      .from(PUPPETEER_TABLE)
      .select('*')
      .order('agrn_reference');
    
    if (puppeteerDbError) throw puppeteerDbError;

    // Get Playwright data
    const { data: playwrightData, error: playwrightDbError } = await supabaseMain
      .from(PLAYWRIGHT_TABLE)
      .select('*')
      .order('agrn');
    
    if (playwrightDbError) throw playwrightDbError;

    // Critical validation checks
    const validationResults = {
      totalCount: { puppeteer: puppeteerData.length, playwright: playwrightData.length },
      activeDisasters: { puppeteer: 0, playwright: 0 },
      mismatches: [],
      criticalErrors: []
    };

    // Create maps for efficient comparison
    const puppeteerMap = new Map(puppeteerData.map(d => [d.agrn_reference, d]));
    const playwrightMap = new Map(playwrightData.map(d => [d.agrn, d]));

    // Check each disaster for consistency
    for (const [agrn, puppeteerDisaster] of puppeteerMap) {
      const playwrightDisaster = playwrightMap.get(agrn);
      
      if (!playwrightDisaster) {
        validationResults.criticalErrors.push({
          type: 'MISSING_IN_PLAYWRIGHT',
          agrn,
          disaster: puppeteerDisaster.event_name
        });
        continue;
      }

      // CRITICAL: Check active disasters (no end date)
      const puppeteerActive = !puppeteerDisaster.expiry_date || 
                             puppeteerDisaster.raw_end_date === '- -' || 
                             puppeteerDisaster.raw_end_date === '-' ||
                             puppeteerDisaster.raw_end_date === '--' ||
                             !puppeteerDisaster.raw_end_date;
      const playwrightActive = !playwrightDisaster.end_date;
      
      if (puppeteerActive) validationResults.activeDisasters.puppeteer++;
      if (playwrightActive) validationResults.activeDisasters.playwright++;
      
      if (puppeteerActive !== playwrightActive) {
        validationResults.criticalErrors.push({
          type: 'ACTIVE_STATUS_MISMATCH',
          agrn,
          disaster: puppeteerDisaster.event_name,
          puppeteer_active: puppeteerActive,
          playwright_active: playwrightActive,
          puppeteer_end: puppeteerDisaster.expiry_date,
          playwright_end: playwrightDisaster.end_date,
          puppeteer_raw: puppeteerDisaster.raw_end_date
        });
      }

      // Compare critical fields with correct column names
      const comparisons = [
        { pField: 'event_name', pwField: 'name', label: 'name' },
        { pField: 'disaster_type', pwField: 'type', label: 'type' },
        { pField: 'state_code', pwField: 'state_code', label: 'state' },
        { pField: 'declaration_date', pwField: 'start_date', label: 'start_date' },
        { pField: 'expiry_date', pwField: 'end_date', label: 'end_date' },
        { pField: 'postcodes', pwField: 'affected_lgas', label: 'affected_areas' }
      ];
      
      for (const comp of comparisons) {
        const puppeteerValue = JSON.stringify(puppeteerDisaster[comp.pField]);
        const playwrightValue = JSON.stringify(playwrightDisaster[comp.pwField]);
        
        if (puppeteerValue !== playwrightValue) {
          validationResults.mismatches.push({
            agrn,
            field: comp.label,
            puppeteer: puppeteerDisaster[comp.pField],
            playwright: playwrightDisaster[comp.pwField]
          });
        }
      }
    }

    // Check for disasters only in Playwright
    for (const [agrn, playwrightDisaster] of playwrightMap) {
      if (!puppeteerMap.has(agrn)) {
        validationResults.criticalErrors.push({
          type: 'MISSING_IN_PUPPETEER',
          agrn,
          disaster: playwrightDisaster.name
        });
      }
    }

    // Step 4: Report results
    console.log('\n📋 [4/4] VALIDATION RESULTS:');
    console.log('─'.repeat(50));
    console.log(`Total Disasters: Puppeteer=${validationResults.totalCount.puppeteer}, Playwright=${validationResults.totalCount.playwright}`);
    console.log(`Active Disasters (NO END DATE): Puppeteer=${validationResults.activeDisasters.puppeteer}, Playwright=${validationResults.activeDisasters.playwright}`);
    
    // Log validation status
    const isValid = validationResults.criticalErrors.length === 0 && 
                   validationResults.mismatches.length === 0 &&
                   validationResults.totalCount.puppeteer === validationResults.totalCount.playwright &&
                   validationResults.activeDisasters.puppeteer === validationResults.activeDisasters.playwright;

    if (isValid) {
      console.log('\n✅✅✅ VALIDATION PASSED - DATA IS CONSISTENT ✅✅✅');
      console.log(`${validationResults.activeDisasters.puppeteer} active disasters eligible for telehealth billing`);
    } else {
      console.log('\n🚨🚨🚨 VALIDATION FAILED - CRITICAL ERRORS DETECTED 🚨🚨🚨');
      console.log('⚠️ MEDICARE COMPLIANCE AT RISK - $500,000 FINE POSSIBLE');
      
      if (validationResults.criticalErrors.length > 0) {
        console.log('\n❌ CRITICAL ERRORS:');
        validationResults.criticalErrors.forEach(err => {
          console.log(`  - ${err.type}: ${err.agrn} (${err.disaster || 'Unknown'})`);
          if (err.type === 'ACTIVE_STATUS_MISMATCH') {
            console.log(`    Puppeteer: ${err.puppeteer_active ? 'ACTIVE' : 'ENDED'} (${err.puppeteer_end || 'NULL'})`);
            console.log(`    Playwright: ${err.playwright_active ? 'ACTIVE' : 'ENDED'} (${err.playwright_end || 'NULL'})`);
          }
        });
      }
      
      if (validationResults.mismatches.length > 0) {
        console.log('\n⚠️ FIELD MISMATCHES:');
        validationResults.mismatches.slice(0, 10).forEach(m => {
          console.log(`  - ${m.agrn}.${m.field}: "${m.puppeteer}" vs "${m.playwright}"`);
        });
        if (validationResults.mismatches.length > 10) {
          console.log(`  ... and ${validationResults.mismatches.length - 10} more mismatches`);
        }
      }
    }

    // Store validation results
    await supabaseMain.from('validation_runs').insert({
      run_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      is_valid: isValid,
      puppeteer_count: validationResults.totalCount.puppeteer,
      playwright_count: validationResults.totalCount.playwright,
      active_disasters_puppeteer: validationResults.activeDisasters.puppeteer,
      active_disasters_playwright: validationResults.activeDisasters.playwright,
      critical_errors: validationResults.criticalErrors,
      mismatches: validationResults.mismatches,
      puppeteer_time_ms: puppeteerTime,
      playwright_time_ms: playwrightTime
    });

    // Send alert if validation failed
    if (!isValid) {
      await sendCriticalAlert(validationResults);
    }

    return isValid;

  } catch (error) {
    console.error('\n💀💀💀 CATASTROPHIC VALIDATION FAILURE 💀💀💀');
    console.error('Error:', error);
    
    // Log critical failure
    await supabaseMain.from('critical_alerts').insert({
      alert_type: 'VALIDATION_CATASTROPHIC_FAILURE',
      message: error.message,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

// Send critical alert when validation fails
async function sendCriticalAlert(results) {
  console.log('\n📨 Sending critical alert...');
  
  await supabaseMain.from('critical_alerts').insert({
    alert_type: 'VALIDATION_MISMATCH',
    message: `Scraper validation failed! ${results.criticalErrors.length} critical errors, ${results.mismatches.length} mismatches`,
    severity: 'CRITICAL',
    details: results,
    timestamp: new Date().toISOString()
  });
  
  // TODO: Implement email/SMS alerting here
  console.log('⚠️ Alert logged to database - implement email/SMS notifications');
}

// Monitor active disasters specifically
async function monitorActiveDisasters() {
  console.log('\n🔍 Monitoring active disasters (no end date)...');
  
  const { data: activeDisasters, error } = await supabaseMain
    .from(PUPPETEER_TABLE)
    .select('agrn_reference, event_name, disaster_type, state_code, declaration_date, expiry_date, raw_end_date, postcodes')
    .or('expiry_date.is.null,raw_end_date.in.("-","–","- -","--","")');
  
  if (error) {
    console.error('Failed to fetch active disasters:', error);
    return;
  }
  
  console.log(`\n📊 Currently ${activeDisasters.length} ACTIVE disasters eligible for telehealth:`);
  activeDisasters.forEach(d => {
    console.log(`  ✅ ${d.agrn_reference}: ${d.event_name} (${d.state_code}) - Started ${d.declaration_date}`);
    console.log(`     Affected postcodes: ${d.postcodes?.length || 0} areas`);
    console.log(`     Raw end date: "${d.raw_end_date}" (NULL = active)`);
  });
  
  // Store active disaster count for monitoring
  await supabaseMain.from('system_metrics').insert({
    metric_type: 'active_disasters',
    value: activeDisasters.length,
    timestamp: new Date().toISOString()
  });
}

// Schedule validation runs
console.log('\n⏰ Scheduling validation tasks:');

// Run full validation every 4 hours
cron.schedule('0 */4 * * *', async () => {
  console.log('\n🔄 Running scheduled validation...');
  await validateScraperData();
});

// Monitor active disasters every hour
cron.schedule('0 * * * *', async () => {
  await monitorActiveDisasters();
});

// Quick health check every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('💓 Health check at', new Date().toISOString());
  
  // Check last validation run
  const { data: lastRun } = await supabaseMain
    .from('validation_runs')
    .select('timestamp, is_valid')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  if (lastRun) {
    const hoursSince = (Date.now() - new Date(lastRun.timestamp).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 6) {
      console.warn(`⚠️ No validation in ${hoursSince.toFixed(1)} hours!`);
    }
    if (!lastRun.is_valid) {
      console.error('🚨 Last validation FAILED - data mismatch detected!');
    }
  }
});

// Run initial validation on startup
console.log('\n🚀 Running initial validation...');
validateScraperData().then(isValid => {
  if (isValid) {
    console.log('\n✅ Initial validation passed - system ready');
  } else {
    console.error('\n🚨 Initial validation FAILED - immediate attention required!');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Validator shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Validator shutting down...');
  process.exit(0);
});

// Keep process running
process.stdin.resume();

console.log('\n🟢 Dual Scraper Validator is running...');
console.log('Press Ctrl+C to stop\n');