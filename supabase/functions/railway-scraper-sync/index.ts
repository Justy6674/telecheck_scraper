import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting Railway scraper sync...')

    // Get the Railway scraper URL from environment
    const scraperUrl = Deno.env.get('SCRAPER_WORKER_URL')
    
    console.log('SCRAPER_WORKER_URL:', scraperUrl)
    
    if (!scraperUrl) {
      // Fallback to known Railway URL if env var not set
      const fallbackUrl = 'https://tele-check-production.up.railway.app'
      console.log('Using fallback URL:', fallbackUrl)
      
      // Try the fallback
      const testResponse = await fetch(`${fallbackUrl}/health`)
      if (testResponse.ok) {
        console.log('Fallback URL works!')
        const scraperUrl = fallbackUrl
      } else {
        throw new Error('SCRAPER_WORKER_URL not configured and fallback failed. Please set in Supabase dashboard.')
      }
    }

    // First test the health endpoint
    console.log('Testing health endpoint:', `${scraperUrl}/health`)
    const healthCheck = await fetch(`${scraperUrl}/health`)
    if (!healthCheck.ok) {
      console.error('Health check failed:', healthCheck.status, await healthCheck.text())
      throw new Error(`Railway scraper health check failed: ${healthCheck.status}`)
    }
    
    const healthData = await healthCheck.json()
    console.log('Health check OK:', healthData)
    
    // Trigger the Railway scraper
    console.log('Calling sync endpoint:', `${scraperUrl}/sync`)
    const response = await fetch(`${scraperUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sync failed:', response.status, errorText)
      throw new Error(`Railway scraper failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Railway scraper response:', result)

    // Get updated stats
    const { data: stats } = await supabase
      .from('disaster_declarations')
      .select('state_code, agrn_reference, event_name')
      .eq('declaration_status', 'active')
      .eq('data_source', 'disasterassist.gov.au')

    const stateCount = new Set(stats?.map(s => s.state_code)).size
    const totalDisasters = stats?.length || 0

    // Log the sync
    await supabase
      .from('data_import_logs')
      .insert({
        import_type: 'railway_scraper_sync',
        source_url: scraperUrl,
        records_imported: totalDisasters,
        import_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          scraper_response: result,
          states_affected: stateCount,
          sync_timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sync triggered successfully`,
        processed: totalDisasters,
        states: stateCount,
        source: 'disasterassist.gov.au',
        scraper_url: scraperUrl,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Railway scraper sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        help: 'Ensure SCRAPER_WORKER_URL is set to your Railway deployment URL'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})