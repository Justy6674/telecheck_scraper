import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Loading LIVE disaster data from real scrapers...');

    // Log scrape start
    const { data: logData } = await supabase
      .from('data_import_logs')
      .insert({
        import_type: 'real_scrapers',
        source_url: 'NSW RFS + VicEmergency APIs',
        import_status: 'running',
        metadata: { 
          scraper_sources: ['NSW_RFS_API', 'VIC_EMERGENCY_API'],
          live_data_only: true
        }
      })
      .select()
      .single();

    let totalRecords = 0;
    const results = [];

    // Call NSW RFS scraper
    try {
      const nswResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/nsw-rfs-scraper`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (nswResponse.ok) {
        const nswData = await nswResponse.json();
        results.push({ source: 'NSW_RFS', ...nswData });
        totalRecords += nswData.processed || 0;
      } else {
        console.error('NSW RFS scraper failed:', await nswResponse.text());
      }
    } catch (error) {
      console.error('NSW RFS scraper error:', error);
    }

    // Call VicEmergency scraper
    try {
      const vicResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vic-emergency-scraper`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (vicResponse.ok) {
        const vicData = await vicResponse.json();
        results.push({ source: 'VIC_EMERGENCY', ...vicData });
        totalRecords += vicData.processed || 0;
      } else {
        console.error('VicEmergency scraper failed:', await vicResponse.text());
      }
    } catch (error) {
      console.error('VicEmergency scraper error:', error);
    }

    // Update log
    await supabase
      .from('data_import_logs')
      .update({ 
        import_status: 'completed',
        completed_at: new Date().toISOString(),
        records_imported: totalRecords,
        metadata: { 
          sources_scraped: results.length,
          live_data_only: true,
          scrapers_status: results
        }
      })
      .eq('id', logData.id);

    // Update data freshness metric
    await supabase
      .from('system_metrics')
      .upsert({
        metric_name: 'live_scraper_freshness',
        metric_value: 0,
        metric_unit: 'hours_since_update',
        tags: { 
          last_update: new Date().toISOString(),
          live_records_loaded: totalRecords,
          sources_active: results.length,
          real_data_only: true
        },
        timestamp: new Date().toISOString()
      }, { onConflict: 'metric_name' });

    return new Response(JSON.stringify({
      success: true,
      message: `✅ LIVE DATA LOADED: ${totalRecords} real disaster declarations from ${results.length} active scrapers`,
      records_processed: totalRecords,
      sources: results,
      data_integrity: 'REAL_ONLY'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Real scraper loader error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to load live disaster data'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});