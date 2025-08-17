import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DisasterEvent {
  agrn: string
  eventName: string
  startDate: string | null
  endDate: string | null
  status: 'Open' | 'Closed'
  state: string
  lgas: string[]
  sourceUrl: string
  declarationAuthority: string
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

    console.log('Starting enhanced Disaster Assist sync...')

    // Crawl state pages to extract detailed disaster information
    const states = ['nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'nt', 'act']
    const allDisasters: DisasterEvent[] = []

    for (const state of states) {
      try {
        console.log(`Crawling ${state.toUpperCase()} disasters...`)
        const stateDisasters = await crawlStateDisasters(state)
        allDisasters.push(...stateDisasters)
        console.log(`Found ${stateDisasters.length} disasters in ${state.toUpperCase()}`)
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error crawling ${state}:`, error)
      }
    }

    console.log(`Total disasters found: ${allDisasters.length}`)

    // Process and upsert to database
    let insertedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    for (const disaster of allDisasters) {
      try {
        // Map LGA names to codes where possible
        const lgaMappings = await mapLgasToCode(supabase, disaster.lgas)
        
        const dbRecord = {
          agrn_reference: disaster.agrn,
          event_name: disaster.eventName,
          disaster_type: extractDisasterType(disaster.eventName),
          declaration_date: disaster.startDate ? new Date(disaster.startDate).toISOString() : new Date().toISOString(),
          expiry_date: disaster.endDate ? new Date(disaster.endDate).toISOString() : null,
          declaration_status: disaster.status === 'Open' ? 'active' : 'expired',
          declaration_authority: disaster.declarationAuthority,
          source_system: 'DisasterAssist',
          source_url: disaster.sourceUrl,
          data_source: 'disasterassist.gov.au',
          state_code: disaster.state.toUpperCase(),
          lga_code: lgaMappings[0]?.lga_code || `${disaster.state.toUpperCase()}001`,
          description: disaster.eventName,
          verification_url: disaster.sourceUrl,
          last_sync_timestamp: new Date().toISOString(),
          affected_areas: {
            lgas: lgaMappings,
            status: disaster.status,
            source_verification: true
          }
        }

        const { data, error } = await supabase
          .from('disaster_declarations')
          .upsert(dbRecord, { 
            onConflict: 'agrn_reference',
            ignoreDuplicates: false 
          })
          .select()

        if (error) {
          console.error(`Failed to upsert disaster ${disaster.agrn}:`, error)
          errors.push(`${disaster.agrn}: ${error.message}`)
        } else {
          if (data && data.length > 0) {
            insertedCount++
          }
        }
      } catch (error) {
        console.error(`Error processing disaster ${disaster.agrn}:`, error)
        errors.push(`${disaster.agrn}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Log the sync
    await supabase
      .from('data_import_logs')
      .insert({
        import_type: 'disaster_assist_enhanced_sync',
        source_url: 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters',
        records_imported: insertedCount,
        records_updated: updatedCount,
        import_status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          total_disasters_found: allDisasters.length,
          states_crawled: states,
          errors: errors,
          sync_timestamp: new Date().toISOString()
        }
      })

    console.log(`✓ Enhanced Disaster Assist sync completed: ${insertedCount} inserted, ${updatedCount} updated, ${errors.length} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: insertedCount,
        updated: updatedCount,
        total_found: allDisasters.length,
        errors: errors.length,
        source: 'disasterassist.gov.au',
        attribution: 'Data sourced from Disaster Assist (disasterassist.gov.au) - Australian Government authoritative disaster registry'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced Disaster Assist sync error:', error)
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

async function crawlStateDisasters(state: string): Promise<DisasterEvent[]> {
  const stateUrl = `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters/${state}`
  
  const response = await fetch(stateUrl, {
    headers: {
      'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${state} page: ${response.status}`)
  }

  const html = await response.text()
  
  // Extract disaster links and basic info from state page
  const disasterLinks = extractDisasterLinks(html, state)
  const disasters: DisasterEvent[] = []

  // Follow each disaster link to get detailed information
  for (const link of disasterLinks.slice(0, 10)) { // Limit to prevent overwhelming
    try {
      const disasterDetail = await crawlDisasterDetail(link)
      if (disasterDetail) {
        disasters.push(disasterDetail)
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Error crawling disaster detail ${link}:`, error)
    }
  }

  return disasters
}

function extractDisasterLinks(html: string, state: string): string[] {
  // Extract disaster event URLs from the state page
  // This is a simplified implementation - would need more robust parsing
  const linkPattern = new RegExp(`href="([^"]*${state}[^"]*disaster[^"]*)"`, 'gi')
  const matches = html.match(linkPattern) || []
  
  return matches
    .map(match => match.replace(/href="([^"]*)"/, '$1'))
    .filter(url => url.includes('disaster'))
    .map(url => url.startsWith('http') ? url : `https://www.disasterassist.gov.au${url}`)
    .slice(0, 20) // Limit results
}

async function crawlDisasterDetail(url: string): Promise<DisasterEvent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    
    // Extract AGRN
    const agrnMatch = html.match(/AGRN\s*:?\s*(\d+)/i)
    if (!agrnMatch) return null

    // Extract dates
    const startDateMatch = html.match(/start.*date.*?(\d{1,2}\/\d{1,2}\/\d{4})/i)
    const endDateMatch = html.match(/end.*date.*?(\d{1,2}\/\d{1,2}\/\d{4})/i)
    
    // Extract status
    const isOpen = !endDateMatch || html.toLowerCase().includes('ongoing') || html.toLowerCase().includes('current')
    
    // Extract disaster name/title
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
    const name = titleMatch ? titleMatch[1].replace(' - Disaster Assist', '').trim() : `Disaster ${agrnMatch[1]}`
    
    // Extract state from URL or content
    const stateMatch = url.match(/\/(nsw|vic|qld|wa|sa|tas|nt|act)\//i)
    const state = stateMatch ? stateMatch[1] : 'unknown'
    
    // Extract LGA information (simplified)
    const lgaMatches = html.match(/local government area|lga|council/gi)
    const lgas = lgaMatches ? [`${state.toUpperCase()}001`] : [] // Placeholder

    return {
      agrn: agrnMatch[1],
      eventName: name,
      startDate: startDateMatch ? parseAustralianDate(startDateMatch[1]) : null,
      endDate: endDateMatch ? parseAustralianDate(endDateMatch[1]) : null,
      status: isOpen ? 'Open' : 'Closed',
      state: state,
      lgas: lgas,
      sourceUrl: url,
      declarationAuthority: 'Commonwealth (DRFA via Disaster Assist)'
    }
  } catch (error) {
    console.error(`Error crawling disaster detail ${url}:`, error)
    return null
  }
}

function parseAustralianDate(dateStr: string): string {
  // Convert DD/MM/YYYY to ISO string
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return new Date(`${year}-${month}-${day}`).toISOString()
  }
  return new Date().toISOString()
}

async function mapLgasToCode(supabase: any, lgaNames: string[]): Promise<{lga_code: string, lga_name: string}[]> {
  if (!lgaNames.length) return []
  
  try {
    const { data } = await supabase
      .from('lga_registry')
      .select('lga_code, lga_name')
      .in('lga_name', lgaNames)
    
    return data || []
  } catch (error) {
    console.error('Error mapping LGA names to codes:', error)
    return []
  }
}

function extractDisasterType(name: string): string {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('flood')) return 'flood'
  if (lowerName.includes('fire') || lowerName.includes('bushfire')) return 'bushfire'
  if (lowerName.includes('cyclone')) return 'cyclone'
  if (lowerName.includes('earthquake')) return 'earthquake'
  if (lowerName.includes('storm')) return 'storm'
  if (lowerName.includes('drought')) return 'drought'
  
  return 'other'
}