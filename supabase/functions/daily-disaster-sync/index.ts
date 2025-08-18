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

    // Get scraper worker URL from environment
    const scraperUrl = Deno.env.get('SCRAPER_WORKER_URL')
    
    if (!scraperUrl) {
      console.error('SCRAPER_WORKER_URL not configured')
      
      // For testing, return sample data
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Scraper worker not configured',
          message: 'Set SCRAPER_WORKER_URL in Supabase dashboard → Edge Functions → Secrets',
          instructions: [
            '1. Deploy scraper-worker to Railway/Render',
            '2. Get the deployment URL',
            '3. Add SCRAPER_WORKER_URL secret in Supabase',
            '4. Re-run this function'
          ]
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Starting daily disaster sync...')
    
    // Call scraper worker to start sync
    const syncResponse = await fetch(`${scraperUrl}/sync/disasters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ immediate: true })
    })

    if (!syncResponse.ok) {
      throw new Error(`Scraper returned ${syncResponse.status}`)
    }

    const { jobId } = await syncResponse.json()
    console.log(`Started sync job: ${jobId}`)

    // Poll for completion (max 5 minutes)
    let attempts = 0
    const maxAttempts = 60 // 5 minutes with 5-second intervals
    let finalStatus = null

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const statusResponse = await fetch(`${scraperUrl}/sync/status/${jobId}`)
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        console.log(`Job ${jobId} status:`, status.status, `Progress: ${status.progress}%`)
        
        if (status.status === 'completed') {
          finalStatus = status
          break
        }
        
        if (status.status === 'failed') {
          throw new Error(`Sync failed: ${status.error}`)
        }
      }
      
      attempts++
    }

    if (!finalStatus) {
      // Job still running, return partial success
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          status: 'running',
          message: 'Sync started but still in progress',
          checkStatusUrl: `${scraperUrl}/sync/status/${jobId}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful sync
    await supabase
      .from('data_import_logs')
      .insert({
        import_type: 'daily_disaster_sync',
        source_url: 'https://www.disasterassist.gov.au',
        records_imported: finalStatus.detailsScraped || 0,
        import_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          job_id: jobId,
          total_disasters: finalStatus.totalDisasters,
          details_scraped: finalStatus.detailsScraped,
          duration_seconds: Math.round(
            (new Date(finalStatus.completedAt).getTime() - new Date(finalStatus.startedAt).getTime()) / 1000
          )
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        totalDisasters: finalStatus.totalDisasters,
        detailsScraped: finalStatus.detailsScraped,
        message: `Successfully synced ${finalStatus.detailsScraped} disasters`,
        attribution: 'Data from DisasterAssist.gov.au - Australian Government'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Daily sync error:', error)
    
    // Log failed sync
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('data_import_logs')
        .insert({
          import_type: 'daily_disaster_sync',
          source_url: 'https://www.disasterassist.gov.au',
          records_imported: 0,
          import_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})