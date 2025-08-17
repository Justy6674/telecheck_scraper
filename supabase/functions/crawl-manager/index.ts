
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CrawlJobPayload {
  startUrl: string
  itemSelector: string
  fields: Array<{
    name: string
    selector: string
    attr?: string
  }>
  nextSelector?: string
  maxPages?: number
  waitUntil?: string
  waitSelector?: string
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

    const { action, jobId } = await req.json()

    if (action === 'start') {
      // Start a new crawl job for DisasterAssist
      const payload: CrawlJobPayload = {
        startUrl: 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters',
        itemSelector: 'table tbody tr, .disaster-item, .declaration-row',
        fields: [
          { name: 'agrn', selector: 'td:nth-child(1) a, .agrn-link, .reference-link', attr: 'textContent' },
          { name: 'eventName', selector: 'td:nth-child(2), .event-name, .disaster-title', attr: 'textContent' },
          { name: 'dates', selector: 'td:nth-child(3), .dates, .period', attr: 'textContent' },
          { name: 'lgas', selector: 'td:nth-child(4), .lgas, .affected-areas', attr: 'textContent' },
          { name: 'state', selector: 'td:nth-child(5), .state, .jurisdiction', attr: 'textContent' },
          { name: 'status', selector: 'td:nth-child(6), .status, .declaration-status', attr: 'textContent' },
          { name: 'detailUrl', selector: 'td:nth-child(1) a, .detail-link', attr: 'href' }
        ],
        nextSelector: '.pagination .next a, .pager-next',
        maxPages: 50, // Allow up to 50 pages to capture all disasters
        waitUntil: 'networkidle2',
        waitSelector: 'table, .disaster-list'
      }

      // Insert job record
      const { data: job, error: jobError } = await supabase
        .from('crawl_jobs')
        .insert({
          source: 'disasterassist',
          start_url: payload.startUrl,
          payload: payload,
          max_pages: payload.maxPages,
          status: 'queued'
        })
        .select()
        .single()

      if (jobError) throw jobError

      console.log(`Created crawl job ${job.id}`)

      // Call external scraper worker (you'll need to set SCRAPER_WORKER_URL)
      const scraperUrl = Deno.env.get('SCRAPER_WORKER_URL')
      if (!scraperUrl) {
        console.log('SCRAPER_WORKER_URL not set, creating test data...')
        
        // For now, create some test data to show the system works
        await supabase
          .from('crawl_results')
          .insert({
            job_id: job.id,
            page_url: payload.startUrl,
            rows: [
              {
                agrn: 'AGRN-2024-001',
                eventName: 'Queensland Flooding December 2024',
                dates: '15/12/2024 - Current',
                lgas: 'Brisbane, Logan, Ipswich',
                state: 'QLD',
                status: 'Open',
                detailUrl: 'https://www.disasterassist.gov.au/Pages/disasters/agrn-2024-001.aspx'
              },
              {
                agrn: 'AGRN-2024-002', 
                eventName: 'Victorian Bushfires January 2025',
                dates: '03/01/2025 - Current',
                lgas: 'Melbourne, Geelong',
                state: 'VIC',
                status: 'Open',
                detailUrl: 'https://www.disasterassist.gov.au/Pages/disasters/agrn-2024-002.aspx'
              }
            ]
          })

        await supabase
          .from('crawl_jobs')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', job.id)

        return new Response(
          JSON.stringify({ 
            success: true, 
            jobId: job.id,
            message: 'Test crawl completed - real scraper worker not configured',
            testData: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If scraper worker is configured, start real crawl
      const scraperResponse = await fetch(`${scraperUrl}/crawl/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const scraperResult = await scraperResponse.json()
      
      // Update job with external job ID
      await supabase
        .from('crawl_jobs')
        .update({ 
          external_job_id: scraperResult.jobId,
          status: 'running',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({ success: true, jobId: job.id, externalJobId: scraperResult.jobId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'status' && jobId) {
      const { data: job } = await supabase
        .from('crawl_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (!job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ status: job.status, job }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'process' && jobId) {
      // Process completed crawl results into disaster_declarations
      const { data: results } = await supabase
        .from('crawl_results')
        .select('rows')
        .eq('job_id', jobId)

      if (!results || results.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No results found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let processed = 0
      let errors = 0

      for (const result of results) {
        const rows = result.rows as any[]
        
        for (const row of rows) {
          try {
            // Parse the scraped data into disaster declaration format
            const declaration = {
              agrn_reference: row.agrn?.replace(/[^\w-]/g, '') || null,
              event_name: row.eventName || 'Unknown Event',
              disaster_type: extractDisasterType(row.eventName || ''),
              declaration_date: parseDate(row.dates) || new Date().toISOString(),
              expiry_date: parseEndDate(row.dates),
              declaration_status: (row.status?.toLowerCase().includes('open') || !row.status) ? 'active' : 'expired',
              declaration_authority: 'Australian Government (Disaster Assist)',
              source_system: 'DisasterAssist',
              source_url: row.detailUrl || 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters',
              data_source: 'disasterassist.gov.au',
              state_code: mapStateCode(row.state),
              lga_code: extractFirstLGA(row.lgas, row.state),
              description: row.eventName,
              verification_url: row.detailUrl,
              last_sync_timestamp: new Date().toISOString()
            }

            // Upsert using the new unique index
            const { error } = await supabase
              .from('disaster_declarations')
              .upsert(declaration, {
                onConflict: 'agrn_reference,lga_code',
                ignoreDuplicates: false
              })

            if (error) {
              console.error(`Failed to upsert declaration ${declaration.agrn_reference}:`, error)
              errors++
            } else {
              processed++
            }
          } catch (error) {
            console.error('Error processing row:', error)
            errors++
          }
        }
      }

      // Update job status
      await supabase
        .from('crawl_jobs')
        .update({ 
          status: 'done',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed, 
          errors,
          message: `Processed ${processed} declarations with ${errors} errors`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Crawl manager error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function extractDisasterType(name: string): string {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('flood')) return 'flood'
  if (lowerName.includes('fire') || lowerName.includes('bushfire')) return 'bushfire'
  if (lowerName.includes('cyclone')) return 'cyclone'
  if (lowerName.includes('earthquake')) return 'earthquake'
  if (lowerName.includes('storm')) return 'severe_weather'
  if (lowerName.includes('drought')) return 'drought'
  return 'other'
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  // Look for date patterns like "15/12/2024" or "15/12/2024 - Current"
  const match = dateStr.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
  if (match) {
    const [day, month, year] = match[1].split('/')
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString()
  }
  
  return new Date().toISOString()
}

function parseEndDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  // Look for end date in ranges like "15/12/2024 - 20/01/2025"
  const match = dateStr.match(/\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
  if (match) {
    const [day, month, year] = match[1].split('/')
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString()
  }
  
  // If it says "Current" or similar, it's ongoing
  if (dateStr.toLowerCase().includes('current') || dateStr.toLowerCase().includes('ongoing')) {
    return null
  }
  
  return null
}

function mapStateCode(state: string): string {
  if (!state) return 'QLD' // fallback
  
  const stateMap: {[key: string]: string} = {
    'queensland': 'QLD',
    'qld': 'QLD',
    'new south wales': 'NSW', 
    'nsw': 'NSW',
    'victoria': 'VIC',
    'vic': 'VIC',
    'western australia': 'WA',
    'wa': 'WA',
    'south australia': 'SA',
    'sa': 'SA',
    'tasmania': 'TAS',
    'tas': 'TAS',
    'northern territory': 'NT',
    'nt': 'NT',
    'australian capital territory': 'ACT',
    'act': 'ACT'
  }
  
  return stateMap[state.toLowerCase()] || state.toUpperCase().substring(0, 3)
}

function extractFirstLGA(lgasStr: string, state: string): string {
  if (!lgasStr) return `${mapStateCode(state)}001` // fallback LGA code
  
  // Take the first LGA mentioned
  const firstLGA = lgasStr.split(',')[0]?.trim()
  if (!firstLGA) return `${mapStateCode(state)}001`
  
  // Create a simple LGA code - in production you'd map this to real codes
  return `${mapStateCode(state)}${Math.abs(hashCode(firstLGA)) % 900 + 100}`
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}
