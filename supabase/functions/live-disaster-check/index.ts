import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DisasterCheckResult {
  postcode: string
  isDisasterZone: boolean
  disasters: any[]
  lgaName?: string
  state?: string
  confidence: 'high' | 'medium' | 'low'
  source: 'database' | 'live_scrape' | 'fallback'
  lastUpdated: string
  practitioner_advisory?: string | null
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

    const { postcode, serviceDate } = await req.json()

    
    if (!postcode) {
      return new Response(
        JSON.stringify({ error: 'Postcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Live disaster check for postcode: ${postcode}`)

    // Step 1: Try database lookup first
    const dbResult = await checkDatabaseFirst(supabase, postcode, serviceDate)
    if (dbResult && dbResult.disasters.length > 0) {
      console.log(`Database found ${dbResult.disasters.length} disasters for ${postcode}`)
      return new Response(
        JSON.stringify(dbResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: If no database results, try live scraping
    console.log(`No database results for ${postcode}, attempting live check...`)
    const liveResult = await performLiveCheck(supabase, postcode)
    
    return new Response(
      JSON.stringify(liveResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Live disaster check error:', error)
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

async function checkDatabaseFirst(supabase: any, postcode: string, serviceDate?: string): Promise<DisasterCheckResult | null> {
  try {
    // Get postcode info with LGA
    const { data: postcodeData } = await supabase
      .from('postcodes')
      .select(`
        *,
        lgas:primary_lga_id (
          name,
          lga_code,
          states_territories:state_territory_id (
            code,
            name
          )
        )
      `)
      .eq('postcode', postcode)
      .single()

    if (!postcodeData) {
      console.log(`Postcode ${postcode} not found in database`)
      return null
    }

    // Check for active disasters affecting this LGA
    const { data: disasters } = await supabase
      .from('disaster_declarations')
      .select('*')
      .eq('lga_code', postcodeData.lgas?.lga_code)
      .eq('declaration_status', 'active')

    const isDisasterZone = disasters && disasters.length > 0
    
    // Check if any disasters have no expiry date (open disasters)
    const hasOpenDisasters = disasters?.some(d => !d.expiry_date) || false

    return {
      postcode,
      isDisasterZone,
      disasters: disasters || [],
      lgaName: postcodeData.lgas?.name,
      state: postcodeData.lgas?.states_territories?.code,
      confidence: 'high',
      source: 'database',
      lastUpdated: new Date().toISOString(),
      practitioner_advisory: hasOpenDisasters ? 
        "This disaster has no published end date. Government disaster sites can be unreliable. As the practitioner, you must make your own clinical decision about telehealth eligibility and document appropriately." :
        null
    }

  } catch (error) {
    console.error('Database check error:', error)
    return null
  }
}

async function performLiveCheck(supabase: any, postcode: string): Promise<DisasterCheckResult> {
  try {
    // First get postcode LGA info from our database
    const { data: postcodeData } = await supabase
      .from('postcodes')
      .select(`
        *,
        lgas:primary_lga_id (
          name,
          lga_code,
          states_territories:state_territory_id (
            code,
            name
          )
        )
      `)
      .eq('postcode', postcode)
      .single()

    const lgaName = postcodeData?.lgas?.name
    const state = postcodeData?.lgas?.states_territories?.code

    console.log(`Live checking for postcode ${postcode}, LGA: ${lgaName}, State: ${state}`)

    // Try to scrape current disaster data
    const liveDisasters = await scrapeLiveDisasterData(lgaName, state, postcode)
    
    const isDisasterZone = liveDisasters.length > 0

    // Store the live check result for future reference
    if (isDisasterZone) {
      await storeLiveCheckResult(supabase, postcode, liveDisasters, lgaName, state)
    }

    return {
      postcode,
      isDisasterZone,
      disasters: liveDisasters,
      lgaName: lgaName || 'Unknown',
      state: state || 'Unknown',
      confidence: isDisasterZone ? 'medium' : 'low',
      source: 'live_scrape',
      lastUpdated: new Date().toISOString(),
      practitioner_advisory: isDisasterZone ? 
        "This disaster was detected via live scraping. Government disaster sites can be unreliable. As the practitioner, you must make your own clinical decision about telehealth eligibility and document appropriately." :
        null
    }

  } catch (error) {
    console.error('Live check error:', error)
    
    // Fallback response
    return {
      postcode,
      isDisasterZone: false,
      disasters: [],
      confidence: 'low',
      source: 'fallback',
      lastUpdated: new Date().toISOString(),
      practitioner_advisory: null
    }
  }
}

async function scrapeLiveDisasterData(lgaName?: string, state?: string, postcode?: string): Promise<any[]> {
  const disasters: any[] = []
  
  try {
    // Method 1: Check Disaster Assist main page
    console.log('Scraping Disaster Assist for live data...')
    const response = await fetch('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      headers: { 'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)' }
    })

    if (response.ok) {
      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')
      
      if (doc) {
        // Look for disaster entries that mention our LGA or state
        const searchTerms = [lgaName, state, postcode].filter(Boolean).map(term => term?.toLowerCase())
        
        const tableRows = doc.querySelectorAll('table tr, .disaster-item, .event-row')
        for (const row of tableRows) {
          const text = row.textContent?.toLowerCase() || ''
          
          // Check if this row mentions our area
          const hasMatch = searchTerms.some(term => text.includes(term))
          
          if (hasMatch) {
            // Extract disaster info from this row
            const links = row.querySelectorAll('a')
            for (const link of links) {
              const href = link.getAttribute('href')
              if (href && href.includes('disaster')) {
                const disasterText = link.textContent?.trim() || 'Unknown Disaster'
                disasters.push({
                  name: disasterText,
                  source_url: href.startsWith('http') ? href : `https://www.disasterassist.gov.au${href}`,
                  area_mentioned: text,
                  discovered_via: 'live_scrape'
                })
              }
            }
          }
        }
      }
    }

    // Method 2: Check state emergency services if we have state info
    if (state && disasters.length === 0) {
      await checkStateEmergencyServices(state, lgaName, disasters)
    }

  } catch (error) {
    console.error('Live scraping error:', error)
  }

  console.log(`Live scraping found ${disasters.length} potential disasters`)
  return disasters
}

async function checkStateEmergencyServices(state: string, lgaName?: string, disasters: any[] = []): Promise<void> {
  const stateUrls: Record<string, string> = {
    'NSW': 'https://www.rfs.nsw.gov.au/fire-information/major-fire-updates',
    'VIC': 'https://emergency.vic.gov.au/respond/',
    'QLD': 'https://www.qfes.qld.gov.au/current-incidents',
    'WA': 'https://www.emergency.wa.gov.au/',
    'SA': 'https://www.cfs.sa.gov.au/site/current_incidents.jsp',
    'TAS': 'https://www.fire.tas.gov.au/Show?pageId=colCurrentIncidents',
    'NT': 'https://ntfrs.com.au/incidents',
    'ACT': 'https://esa.act.gov.au/current-incidents'
  }

  const url = stateUrls[state]
  if (!url) return

  try {
    console.log(`Checking ${state} emergency services: ${url}`)
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)' }
    })

    if (response.ok) {
      const html = await response.text()
      
      // Look for mentions of our LGA in the emergency page
      if (lgaName && html.toLowerCase().includes(lgaName.toLowerCase())) {
        disasters.push({
          name: `Emergency in ${lgaName}, ${state}`,
          source_url: url,
          area_mentioned: lgaName,
          discovered_via: 'state_emergency_check'
        })
      }
    }
  } catch (error) {
    console.error(`Error checking ${state} emergency services:`, error)
  }
}

async function storeLiveCheckResult(supabase: any, postcode: string, disasters: any[], lgaName?: string, state?: string): Promise<void> {
  try {
    // Store in postcode_verifications for audit trail
    await supabase
      .from('postcode_verifications')
      .insert({
        postcode,
        suburb: lgaName,
        is_disaster_zone: disasters.length > 0,
        verification_method: 'live_scrape',
        data_sources: { live_disasters: disasters },
        mbs_eligible: disasters.length > 0,
        created_at: new Date().toISOString()
      })

    console.log(`Stored live check result for ${postcode}`)
  } catch (error) {
    console.error('Error storing live check result:', error)
  }
}