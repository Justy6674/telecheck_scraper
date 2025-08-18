#!/usr/bin/env node

/**
 * SIMPLE RAILWAY TEST - No Puppeteer, just database
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 8080;

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🚀 Railway Test Server starting...');

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'Railway Test',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    // Count disasters
    const { data, error } = await supabase
      .from('disaster_declarations')
      .select('state_code', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ 
      success: true,
      message: 'Database connected',
      disaster_count: data
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Test simple save
app.get('/test-save', async (req, res) => {
  try {
    const { error } = await supabase
      .from('scrape_runs')
      .insert({
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        scraper_version: 'railway-test-v1',
        total_disasters_found: 999,
        active_disasters_found: 999,
        scrape_type: 'test',
        validation_passed: true
      });
    
    if (error) throw error;
    
    res.json({ 
      success: true,
      message: 'Test data saved to database'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('📊 Test endpoints:');
  console.log(`  GET / - Health check`);
  console.log(`  GET /test-db - Test database connection`);
  console.log(`  GET /test-save - Test saving to database`);
});