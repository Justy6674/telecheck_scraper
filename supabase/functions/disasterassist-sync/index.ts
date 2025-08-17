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

    // Crawl the main disasters page to get all current disasters
    const allDisasters = await crawlAllDisasters()

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
          source_url: 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters',
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

async function crawlAllDisasters(): Promise<DisasterEvent[]> {
  const mainUrl = 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
  
  console.log('Fetching main disasters page...')
  const response = await fetch(mainUrl, {
    headers: {
      'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch disasters page: ${response.status}`)
  }

  const html = await response.text()
  
  // Extract disaster links from the main table
  const disasterLinks = extractDisasterLinksFromTable(html)
  console.log(`Found ${disasterLinks.length} disaster links`)
  
  const disasters: DisasterEvent[] = []

  // Follow each disaster link to get detailed information
  for (const link of disasterLinks) {
    try {
      const disasterDetail = await crawlDisasterDetail(link)
      if (disasterDetail) {
        disasters.push(disasterDetail)
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`Error crawling disaster detail ${link}:`, error)
    }
  }

  return disasters
}

function extractDisasterLinksFromTable(html: string): string[] {
  // Extract disaster links from the main table - look for AGRN links
  const linkPattern = /href="([^"]*\/Pages\/disasters\/[^"]*\.aspx)"/gi
  const matches = html.match(linkPattern) || []
  
  const links = matches
    .map(match => match.replace(/href="([^"]*)"/, '$1'))
    .map(url => url.startsWith('http') ? url : `https://www.disasterassist.gov.au${url}`)
    .filter((url, index, array) => array.indexOf(url) === index) // Remove duplicates
  
  console.log(`Extracted ${links.length} unique disaster links`)
  return links
}

async function crawlDisasterDetail(url: string): Promise<DisasterEvent | null> {
  try {
    console.log(`Crawling disaster: ${url}`)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch disaster page: ${response.status}`)
      return null
    }

    const html = await response.text()
    
    // Extract AGRN from URL or content
    const agrnFromUrl = url.match(/agrn-(\d+)/i)
    const agrnFromContent = html.match(/AGRN\s*:?\s*(\d+)/i)
    const agrn = agrnFromUrl?.[1] || agrnFromContent?.[1]
    
    if (!agrn) {
      console.error('No AGRN found for disaster')
      return null
    }

    // Extract dates with better patterns
    const startDateMatch = html.match(/(?:start\s*date|from)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
                           html.match(/(\d{1,2}\/\d{1,2}\/\d{4})/) // fallback
    const endDateMatch = html.match(/(?:end\s*date|until|to)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    
    // Check if disaster is ongoing (no end date means active)
    const isOngoing = !endDateMatch || html.toLowerCase().includes('ongoing') || 
                      html.toLowerCase().includes('current') || 
                      html.toLowerCase().includes('- -') // dash indicates ongoing
    
    // Extract disaster name from title or heading
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
    const h1Match = html.match(/<h1[^>]*>([^<]+)</i)
    const name = (h1Match?.[1] || titleMatch?.[1] || `Disaster ${agrn}`)
      .replace(' - Disaster Assist', '')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Extract state from URL path
    const stateMatch = url.match(/\/disasters\/([^\/]+)\//i)
    let state = 'unknown'
    if (stateMatch) {
      const stateMap: {[key: string]: string} = {
        'new-south-wales': 'NSW',
        'victoria': 'VIC', 
        'queensland': 'QLD',
        'western-australia': 'WA',
        'south-australia': 'SA',
        'tasmania': 'TAS',
        'northern-territory': 'NT',
        'australian-capital-territory': 'ACT'
      }
      state = stateMap[stateMatch[1]] || stateMatch[1].toUpperCase().substring(0, 3)
    }
    
    // Extract LGA information from content
    const lgaPattern = /(?:local government area|lga|council|shire|city)s?\s*[:]*\s*([^<\n\r]+)/gi
    const lgaMatches = html.match(lgaPattern) || []
    const lgas = lgaMatches.map(match => 
      match.replace(/(?:local government area|lga|council|shire|city)s?\s*[:]*\s*/gi, '').trim()
    ).filter(lga => lga.length > 0).slice(0, 5) // limit to 5 LGAs

    console.log(`Parsed disaster: ${name} (AGRN: ${agrn}) - ${state} - Active: ${isOngoing}`)

    return {
      agrn: agrn,
      eventName: name,
      startDate: startDateMatch ? parseAustralianDate(startDateMatch[1]) : new Date().toISOString(),
      endDate: endDateMatch ? parseAustralianDate(endDateMatch[1]) : null,
      status: isOngoing ? 'Open' : 'Closed',
      state: state,
      lgas: lgas.length > 0 ? lgas : [`${state}001`], // fallback LGA code
      sourceUrl: url,
      declarationAuthority: 'Australian Government (Disaster Assist)'
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