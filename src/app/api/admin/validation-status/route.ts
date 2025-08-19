import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get latest validation runs
    const { data: validationRuns, error: validationError } = await supabase
      .from('validation_runs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);

    // Get active disasters count from both scrapers
    const { data: puppeteerActive } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, event_name, state_code, raw_end_date')
      .or('expiry_date.is.null,raw_end_date.in.("-","–","- -","--","")');

    const { data: playwrightActive } = await supabase
      .from('disaster_declarations_validation')
      .select('agrn, name, state_code, end_date')
      .is('end_date', null);

    // Get recent scrape runs
    const { data: scrapeRuns } = await supabase
      .from('scrape_runs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(10);

    // Check for critical alerts
    const { data: alerts } = await supabase
      .from('critical_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('timestamp', { ascending: false })
      .limit(5);

    // Calculate validation status
    const latestValidation = validationRuns?.[0];
    const puppeteerCount = puppeteerActive?.length || 0;
    const playwrightCount = playwrightActive?.length || 0;
    const dataMatches = puppeteerCount === playwrightCount;

    // Group active disasters by state
    const stateBreakdown: Record<string, { puppeteer: number; playwright: number }> = {};
    
    puppeteerActive?.forEach(d => {
      if (!stateBreakdown[d.state_code]) {
        stateBreakdown[d.state_code] = { puppeteer: 0, playwright: 0 };
      }
      stateBreakdown[d.state_code].puppeteer++;
    });

    playwrightActive?.forEach(d => {
      if (!stateBreakdown[d.state_code]) {
        stateBreakdown[d.state_code] = { puppeteer: 0, playwright: 0 };
      }
      stateBreakdown[d.state_code].playwright++;
    });

    // Format response
    const response = {
      validation: {
        latest: latestValidation,
        history: validationRuns || [],
        dataMatches,
        confidence: dataMatches ? 100 : Math.round((Math.min(puppeteerCount, playwrightCount) / Math.max(puppeteerCount, playwrightCount)) * 100)
      },
      activeDisasters: {
        puppeteer: puppeteerCount,
        playwright: playwrightCount,
        match: dataMatches,
        stateBreakdown
      },
      scrapeRuns: scrapeRuns || [],
      alerts: alerts || [],
      medicareCompliance: {
        isCompliant: dataMatches && puppeteerCount > 0,
        totalEligible: puppeteerCount,
        riskLevel: !dataMatches ? 'HIGH' : puppeteerCount === 0 ? 'MEDIUM' : 'LOW',
        message: !dataMatches 
          ? '🚨 CRITICAL: Scraper mismatch detected - $500,000 fine risk!' 
          : puppeteerCount === 0 
          ? '⚠️ WARNING: No active disasters found' 
          : `✅ ${puppeteerCount} disasters eligible for telehealth billing`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Validation status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validation status' },
      { status: 500 }
    );
  }
}