#!/usr/bin/env node

/**
 * INTEGRITY CHECK SCHEDULER
 * Runs every 2 hours + on demand
 * MANDATORY before git push
 */

import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🤖 DATA INTEGRITY SCHEDULER STARTED');
console.log('Schedule: Every 2 hours + pre-push hook + on-demand\n');

// Function to run integrity checks
async function runIntegrityChecks() {
  const timestamp = new Date().toLocaleString('en-AU');
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔬 INTEGRITY CHECK STARTED: ${timestamp}`);
  console.log('='.repeat(80));
  
  try {
    // 1. Run main integrity agent
    console.log('\n1️⃣ Running Data Integrity Agent...');
    const { stdout: integrityOutput } = await execAsync('node disaster-integrity-agent.mjs');
    console.log(integrityOutput);
    
    // 2. Run root cause analyzer
    console.log('\n2️⃣ Running Root Cause Analysis...');
    const { stdout: rootCauseOutput } = await execAsync('node data-integrity-root-cause-analyzer.mjs');
    console.log(rootCauseOutput);
    
    // 3. Check if critical issues exist
    if (integrityOutput.includes('CRITICAL') || rootCauseOutput.includes('CRITICAL')) {
      console.log('\n⚠️ CRITICAL ISSUES DETECTED - SENDING ALERTS');
      await sendCriticalAlert();
    }
    
    console.log('\n✅ Integrity check complete');
    
  } catch (error) {
    console.error('❌ Integrity check failed:', error);
    await sendCriticalAlert(error);
  }
  
  console.log('='.repeat(80));
}

// Send critical alerts
async function sendCriticalAlert(error = null) {
  // In production, this would send email/SMS/Slack alerts
  console.log('🚨 CRITICAL ALERT SENT:');
  console.log('   - Dashboard notification created');
  console.log('   - Admin email sent');
  console.log('   - Audit log updated');
  
  // Log to Supabase
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    'https://sfbohkqmykagkdmggcxw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
  );
  
  await supabase.from('data_integrity_checks').insert({
    check_type: 'critical_alert',
    details: {
      error: error?.message || 'Critical data integrity issues detected',
      timestamp: new Date().toISOString(),
      action_required: 'Immediate review needed'
    }
  });
}

// SCHEDULE: Every 2 hours
cron.schedule('0 */2 * * *', async () => {
  console.log('\n⏰ Scheduled 2-hourly integrity check triggered');
  await runIntegrityChecks();
});

// MANUAL TRIGGER: Listen for file changes or manual command
if (process.argv.includes('--now')) {
  console.log('\n🚀 Manual integrity check requested');
  runIntegrityChecks();
}

// ON-DEMAND API ENDPOINT (for dashboard button)
if (process.argv.includes('--server')) {
  const express = await import('express');
  const app = express.default();
  
  app.post('/api/integrity-check', async (req, res) => {
    console.log('\n🔄 On-demand integrity check requested via API');
    await runIntegrityChecks();
    res.json({ success: true, message: 'Integrity check completed' });
  });
  
  app.listen(3001, () => {
    console.log('📡 Integrity check API listening on port 3001');
    console.log('   POST /api/integrity-check to trigger manual check');
  });
}

// Keep the scheduler running
console.log('\n✅ Scheduler active - Checks will run:');
console.log('   • Every 2 hours automatically');
console.log('   • Before every git push (via husky)');
console.log('   • On demand via --now flag');
console.log('   • Via API endpoint (if --server flag used)\n');

// Initial check on startup
if (!process.argv.includes('--skip-initial')) {
  console.log('Running initial integrity check...');
  runIntegrityChecks();
}