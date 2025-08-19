#!/usr/bin/env node

/**
 * MEDICARE COMPLIANCE DASHBOARD
 * Real-time monitoring of dual-scraper validation for telehealth eligibility
 * $500,000 fine risk - MUST maintain 100% accuracy
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfbohkqmykagkdmggcxw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.clear();

async function displayDashboard() {
  console.log(chalk.bgRed.white.bold('\n ════════════════════════════════════════════════════════════ '));
  console.log(chalk.bgRed.white.bold(' ║  TELECHECK MEDICARE COMPLIANCE DASHBOARD - LIVE STATUS  ║ '));
  console.log(chalk.bgRed.white.bold(' ║  Risk: $500,000 fine for incorrect telehealth billing   ║ '));
  console.log(chalk.bgRed.white.bold(' ════════════════════════════════════════════════════════════ '));
  
  try {
    // 1. Check active disasters
    const { data: activeDisasters } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, event_name, state_code, raw_end_date')
      .or('expiry_date.is.null,raw_end_date.in.("-","–","- -","--","")');
    
    const activeCount = activeDisasters?.length || 0;
    
    // 2. Group by state
    const stateBreakdown = {};
    activeDisasters?.forEach(d => {
      if (!stateBreakdown[d.state_code]) {
        stateBreakdown[d.state_code] = [];
      }
      stateBreakdown[d.state_code].push(d);
    });
    
    // 3. Check validation status
    const { data: lastValidation } = await supabase
      .from('validation_runs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    // 4. Check last scrape runs
    const { data: lastScrapes } = await supabase
      .from('scrape_runs')
      .select('scraper_type, completed_at, total_scraped, active_disasters')
      .order('completed_at', { ascending: false })
      .limit(2);
    
    // Display active disasters summary
    console.log(chalk.cyan.bold('\n📊 ACTIVE DISASTERS (Eligible for Telehealth):'));
    console.log(chalk.white('─'.repeat(60)));
    console.log(chalk.green.bold(`Total Active: ${activeCount} disasters`));
    console.log(chalk.yellow(`States Affected: ${Object.keys(stateBreakdown).length}`));
    
    // State breakdown
    console.log(chalk.cyan.bold('\n🗺️  STATE BREAKDOWN:'));
    console.log(chalk.white('─'.repeat(60)));
    Object.entries(stateBreakdown).forEach(([state, disasters]) => {
      const statusIcon = disasters.length > 0 ? '✅' : '⚠️';
      console.log(chalk.white(`${statusIcon} ${state}: ${disasters.length} active disasters`));
      disasters.slice(0, 3).forEach(d => {
        console.log(chalk.gray(`   • ${d.event_name.substring(0, 50)}...`));
      });
      if (disasters.length > 3) {
        console.log(chalk.gray(`   ... and ${disasters.length - 3} more`));
      }
    });
    
    // Validation status
    console.log(chalk.cyan.bold('\n🔍 DUAL-SCRAPER VALIDATION STATUS:'));
    console.log(chalk.white('─'.repeat(60)));
    
    if (lastValidation) {
      const validIcon = lastValidation.is_valid ? '✅' : '🚨';
      const validColor = lastValidation.is_valid ? chalk.green : chalk.red;
      
      console.log(validColor(`${validIcon} Last Validation: ${lastValidation.is_valid ? 'PASSED' : 'FAILED'}`));
      console.log(chalk.white(`   Timestamp: ${new Date(lastValidation.timestamp).toLocaleString()}`));
      console.log(chalk.white(`   Puppeteer Count: ${lastValidation.puppeteer_count || 0}`));
      console.log(chalk.white(`   Playwright Count: ${lastValidation.playwright_count || 0}`));
      console.log(chalk.white(`   Active (Puppeteer): ${lastValidation.active_disasters_puppeteer || 0}`));
      console.log(chalk.white(`   Active (Playwright): ${lastValidation.active_disasters_playwright || 0}`));
      
      if (!lastValidation.is_valid) {
        console.log(chalk.red.bold('\n⚠️  VALIDATION ERRORS:'));
        const errors = lastValidation.critical_errors || [];
        errors.slice(0, 5).forEach(err => {
          console.log(chalk.red(`   • ${err.type}: ${err.agrn}`));
        });
      }
    } else {
      console.log(chalk.yellow('⏳ No validation runs found yet'));
    }
    
    // Recent scrapes
    console.log(chalk.cyan.bold('\n📈 RECENT SCRAPER RUNS:'));
    console.log(chalk.white('─'.repeat(60)));
    lastScrapes?.forEach(scrape => {
      const timeAgo = Math.round((Date.now() - new Date(scrape.completed_at).getTime()) / (1000 * 60));
      console.log(chalk.white(`${scrape.scraper_type}: ${timeAgo} minutes ago`));
      console.log(chalk.gray(`   Total: ${scrape.total_scraped}, Active: ${scrape.active_disasters || 0}`));
    });
    
    // Critical checks
    console.log(chalk.cyan.bold('\n⚡ CRITICAL COMPLIANCE CHECKS:'));
    console.log(chalk.white('─'.repeat(60)));
    
    // Check 1: Active disasters with "- -" end date
    const nullEndDateCount = activeDisasters?.filter(d => 
      d.raw_end_date === '- -' || d.raw_end_date === '-' || !d.raw_end_date
    ).length || 0;
    
    console.log(chalk.green(`✅ Active disasters with NULL end date: ${nullEndDateCount}`));
    
    // Check 2: NSW disasters (should have multiple)
    const nswCount = stateBreakdown['NSW']?.length || 0;
    const nswStatus = nswCount >= 3 ? '✅' : '⚠️';
    console.log(chalk[nswCount >= 3 ? 'green' : 'yellow'](`${nswStatus} NSW active disasters: ${nswCount} (expected 3+)`));
    
    // Check 3: Data freshness
    const lastScrapeTime = lastScrapes?.[0]?.completed_at;
    const hoursSinceLastScrape = lastScrapeTime 
      ? (Date.now() - new Date(lastScrapeTime).getTime()) / (1000 * 60 * 60)
      : 999;
    const freshnessIcon = hoursSinceLastScrape < 8 ? '✅' : '⚠️';
    console.log(chalk[hoursSinceLastScrape < 8 ? 'green' : 'yellow'](
      `${freshnessIcon} Data freshness: ${hoursSinceLastScrape.toFixed(1)} hours old`
    ));
    
    // Check 4: Validation consistency
    if (lastValidation) {
      const consistencyIcon = lastValidation.is_valid ? '✅' : '🚨';
      console.log(chalk[lastValidation.is_valid ? 'green' : 'red'](
        `${consistencyIcon} Scraper consistency: ${lastValidation.is_valid ? 'MATCHED' : 'MISMATCH DETECTED'}`
      ));
    }
    
    // Medicare billing summary
    console.log(chalk.bgGreen.black.bold('\n 💰 MEDICARE TELEHEALTH BILLING STATUS '));
    console.log(chalk.white('─'.repeat(60)));
    console.log(chalk.green.bold(`${activeCount} disasters currently eligible for telehealth billing`));
    console.log(chalk.white('Affected states can bill Medicare for remote consultations'));
    console.log(chalk.yellow('⚠️  ALWAYS verify with latest government data before billing'));
    
    // Footer
    console.log(chalk.gray('\n─'.repeat(60)));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleString()}`));
    console.log(chalk.gray('Press Ctrl+C to exit | Updates every 30 seconds'));
    
  } catch (error) {
    console.error(chalk.red('❌ Dashboard error:'), error.message);
  }
}

// Run dashboard
async function runDashboard() {
  await displayDashboard();
  
  // Refresh every 30 seconds
  setInterval(async () => {
    console.clear();
    await displayDashboard();
  }, 30000);
}

// Initialize
console.log(chalk.yellow('🔄 Loading Medicare Compliance Dashboard...'));
runDashboard().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.gray('\n\n👋 Dashboard shutting down...'));
  process.exit(0);
});