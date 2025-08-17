
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

    console.log('Starting enhanced disaster sync via crawl manager...')

    // Start a crawl job
    const crawlResponse = await supabase.functions.invoke('crawl-manager', {
      body: { action: 'start' }
    })

    if (crawlResponse.error) {
      throw new Error(`Crawl start failed: ${crawlResponse.error.message}`)
    }

    const { jobId, testData } = crawlResponse.data

    console.log(`Started crawl job ${jobId}${testData ? ' (test mode)' : ''}`)

    // If test mode, process immediately
    if (testData) {
      const processResponse = await supabase.functions.invoke('crawl-manager', {
        body: { action: 'process', jobId }
      })

      if (processResponse.error) {
        throw new Error(`Process failed: ${processResponse.error.message}`)
      }

      console.log('Test data processed:', processResponse.data)

      // Log the successful sync
      await supabase
        .from('data_import_logs')
        .insert({
          import_type: 'enhanced_disaster_sync',
          source_url: 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters',
          records_imported: processResponse.data.processed || 0,
          import_status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            job_id: jobId,
            test_mode: true,
            errors: processResponse.data.errors || 0,
            sync_timestamp: new Date().toISOString()
          }
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId,
          testMode: true,
          processed: processResponse.data.processed,
          message: 'Enhanced sync completed in test mode',
          attribution: 'Data sourced from Disaster Assist (disasterassist.gov.au) - Australian Government authoritative disaster registry'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For real scraper worker, we'd poll until completion
    // This is a simplified version - in production you'd use a background job
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const statusResponse = await supabase.functions.invoke('crawl-manager', {
        body: { action: 'status', jobId }
      })

      if (statusResponse.error) {
        console.error('Status check failed:', statusResponse.error)
        break
      }

      const { status } = statusResponse.data
      console.log(`Job ${jobId} status: ${status}`)

      if (status === 'done') {
        // Process the results
        const processResponse = await supabase.functions.invoke('crawl-manager', {
          body: { action: 'process', jobId }
        })

        if (processResponse.error) {
          throw new Error(`Process failed: ${processResponse.error.message}`)
        }

        // Log successful sync
        await supabase
          .from('data_import_logs')
          .insert({
            import_type: 'enhanced_disaster_sync',
            source_url: 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters',
            records_imported: processResponse.data.processed || 0,
            import_status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              job_id: jobId,
              errors: processResponse.data.errors || 0,
              sync_timestamp: new Date().toISOString()
            }
          })

        return new Response(
          JSON.stringify({ 
            success: true, 
            jobId,
            processed: processResponse.data.processed,
            errors: processResponse.data.errors,
            message: `Enhanced sync completed: ${processResponse.data.processed} disasters processed`,
            attribution: 'Data sourced from Disaster Assist (disasterassist.gov.au) - Australian Government authoritative disaster registry'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (status === 'failed') {
        throw new Error('Crawl job failed')
      }

      attempts++
    }

    throw new Error('Crawl job timed out')

  } catch (error) {
    console.error('Enhanced disaster sync error:', error)
    
    // Log the failed sync
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase
        .from('data_import_logs')
        .insert({
          import_type: 'enhanced_disaster_sync',
          source_url: 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters',
          records_imported: 0,
          import_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
          metadata: {
            error_details: error instanceof Error ? error.stack : String(error),
            sync_timestamp: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        attribution: 'Data sourced from Disaster Assist (disasterassist.gov.au) - Australian Government authoritative disaster registry'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
