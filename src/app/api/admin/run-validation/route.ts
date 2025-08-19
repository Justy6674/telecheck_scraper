import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Check admin authorization (you should add proper auth check here)
    
    // Run both scrapers in parallel
    console.log('Starting dual-scraper validation...');
    
    const validationId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Log start of validation
    await supabase.from('validation_runs').insert({
      run_id: validationId,
      timestamp: new Date().toISOString(),
      is_valid: false, // Will update after completion
      puppeteer_count: 0,
      playwright_count: 0,
      active_disasters_puppeteer: 0,
      active_disasters_playwright: 0,
      critical_errors: [],
      mismatches: [],
      puppeteer_time_ms: 0,
      playwright_time_ms: 0
    });

    // Run Puppeteer scraper
    const puppeteerPromise = execAsync('node scrape-all-disasters-puppeteer.mjs').catch(err => ({
      stdout: '',
      stderr: err.message
    }));

    // Run Playwright scraper  
    const playwrightPromise = execAsync('node validation-scraper-playwright.mjs').catch(err => ({
      stdout: '',
      stderr: err.message
    }));

    // Wait for both to complete
    const [puppeteerResult, playwrightResult] = await Promise.all([
      puppeteerPromise,
      playwrightPromise
    ]);

    // Get counts from both tables
    const { data: puppeteerData } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference')
      .or('expiry_date.is.null,raw_end_date.in.("-","–","- -","--","")');

    const { data: playwrightData } = await supabase
      .from('disaster_declarations_validation')
      .select('agrn')
      .is('end_date', null);

    const puppeteerCount = puppeteerData?.length || 0;
    const playwrightCount = playwrightData?.length || 0;
    const isValid = puppeteerCount === playwrightCount;

    // Update validation run with results
    await supabase
      .from('validation_runs')
      .update({
        is_valid: isValid,
        puppeteer_count: puppeteerData?.length || 0,
        playwright_count: playwrightData?.length || 0,
        active_disasters_puppeteer: puppeteerCount,
        active_disasters_playwright: playwrightCount,
        puppeteer_time_ms: Date.now() - startTime,
        playwright_time_ms: Date.now() - startTime
      })
      .eq('run_id', validationId);

    // Create alert if validation failed
    if (!isValid) {
      await supabase.from('critical_alerts').insert({
        alert_type: 'VALIDATION_FAILED',
        message: `Scraper mismatch: Puppeteer=${puppeteerCount}, Playwright=${playwrightCount}`,
        severity: 'CRITICAL',
        details: {
          puppeteer_count: puppeteerCount,
          playwright_count: playwrightCount,
          validation_id: validationId
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      validationId,
      results: {
        puppeteer: puppeteerCount,
        playwright: playwrightCount,
        match: isValid,
        medicareCompliance: isValid && puppeteerCount > 0,
        message: isValid 
          ? `✅ Validation passed: ${puppeteerCount} active disasters eligible for telehealth`
          : `🚨 VALIDATION FAILED: Puppeteer=${puppeteerCount}, Playwright=${playwrightCount}`
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}