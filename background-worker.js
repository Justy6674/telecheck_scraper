#!/usr/bin/env node

/**
 * TELECHECK BACKGROUND WORKER
 * Runs continuously to handle scheduled tasks
 */

import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://sfbohkqmykagkdmggcxw.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🤖 TeleCheck Background Worker Started');
console.log('⏰ Scheduled Tasks:');
console.log('  - Disaster scraping: Every 8 hours');
console.log('  - Usage reset: Monthly');
console.log('  - Health check: Every 5 minutes');

// Task 1: Scrape disasters every 8 hours
cron.schedule('0 */8 * * *', async () => {
  console.log('\n📊 Running disaster scraper...');
  try {
    const { stdout, stderr } = await execAsync('node scrape-all-disasters-puppeteer.mjs');
    console.log('✅ Scraping complete');
    
    // Log to database
    await supabase.from('system_logs').insert({
      task: 'disaster_scrape',
      status: 'success',
      output: stdout,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    
    // Log error
    await supabase.from('system_logs').insert({
      task: 'disaster_scrape',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Task 2: Reset monthly verification counts
cron.schedule('0 0 1 * *', async () => {
  console.log('\n📅 Resetting monthly verification counts...');
  try {
    const { error } = await supabase
      .from('organizations')
      .update({ 
        verifications_used: 0,
        billing_period_start: new Date().toISOString()
      })
      .eq('subscription_status', 'active');
    
    if (error) throw error;
    console.log('✅ Verification counts reset');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
});

// Task 3: Health check every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('disaster_declarations')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    // Check if scrapers are running
    const { data: lastRun } = await supabase
      .from('scrape_runs')
      .select('completed_at')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    const hoursSinceLastRun = lastRun 
      ? (Date.now() - new Date(lastRun.completed_at).getTime()) / (1000 * 60 * 60)
      : 999;
    
    if (hoursSinceLastRun > 24) {
      console.warn('⚠️ WARNING: No scrape in 24+ hours');
      
      // Send alert (implement email/SMS here)
      await supabase.from('alerts').insert({
        type: 'scraper_stale',
        message: `Last scrape was ${hoursSinceLastRun.toFixed(1)} hours ago`,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`💚 Health check OK - Last scrape: ${hoursSinceLastRun.toFixed(1)}h ago`);
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
});

// Task 4: Clean up old logs weekly
cron.schedule('0 0 * * 0', async () => {
  console.log('\n🧹 Cleaning up old logs...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error } = await supabase
      .from('verification_logs')
      .delete()
      .lt('verified_at', thirtyDaysAgo.toISOString());
    
    if (error) throw error;
    console.log('✅ Old logs cleaned');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down background worker...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down background worker...');
  process.exit(0);
});

// Keep the process running
process.stdin.resume();

console.log('\n✅ Background worker is running...');
console.log('Press Ctrl+C to stop\n');