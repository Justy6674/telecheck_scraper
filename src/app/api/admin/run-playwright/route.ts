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
    console.log('🎭 Starting Playwright scraper...');
    
    const startTime = Date.now();
    
    // Run Playwright scraper
    const { stdout, stderr } = await execAsync('node validation-scraper-playwright.mjs');
    
    const duration = Date.now() - startTime;
    
    // Get the results from validation table
    const { data: disasters, error } = await supabase
      .from('disaster_declarations_validation')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    
    // Count active disasters (NULL end date)
    const activeDisasters = disasters?.filter(d => !d.end_date);
    
    // Log the scrape run
    await supabase.from('scrape_runs').insert({
      scraper_type: 'playwright',
      total_scraped: disasters?.length || 0,
      active_disasters: activeDisasters?.length || 0,
      duration_seconds: duration / 1000,
      completed_at: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      scraper: 'playwright',
      results: {
        total: disasters?.length || 0,
        active: activeDisasters?.length || 0,
        duration: `${(duration / 1000).toFixed(2)}s`,
        states: [...new Set(disasters?.map(d => d.state_code))],
        message: `🎭 Playwright found ${activeDisasters?.length} active disasters eligible for telehealth`
      }
    });
    
  } catch (error) {
    console.error('Playwright scraper error:', error);
    return NextResponse.json(
      { 
        success: false,
        scraper: 'playwright',
        error: 'Scraper failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}