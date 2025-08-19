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
    console.log('🚀 Starting Puppeteer scraper...');
    
    const startTime = Date.now();
    
    // Run Puppeteer scraper
    const { stdout, stderr } = await execAsync('node scrape-all-disasters-puppeteer.mjs');
    
    const duration = Date.now() - startTime;
    
    // Get the results
    const { data: disasters, error } = await supabase
      .from('disaster_declarations')
      .select('*')
      .order('declaration_date', { ascending: false });
    
    if (error) throw error;
    
    // Count active disasters (NULL end date)
    const activeDisasters = disasters?.filter(d => 
      !d.expiry_date || d.raw_end_date === '- -' || d.raw_end_date === '-' || !d.raw_end_date
    );
    
    // Log the scrape run
    await supabase.from('scrape_runs').insert({
      scraper_type: 'puppeteer',
      total_scraped: disasters?.length || 0,
      active_disasters: activeDisasters?.length || 0,
      duration_seconds: duration / 1000,
      completed_at: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      scraper: 'puppeteer',
      results: {
        total: disasters?.length || 0,
        active: activeDisasters?.length || 0,
        duration: `${(duration / 1000).toFixed(2)}s`,
        states: [...new Set(disasters?.map(d => d.state_code))],
        message: `✅ Puppeteer found ${activeDisasters?.length} active disasters eligible for telehealth`
      }
    });
    
  } catch (error) {
    console.error('Puppeteer scraper error:', error);
    return NextResponse.json(
      { 
        success: false,
        scraper: 'puppeteer',
        error: 'Scraper failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}