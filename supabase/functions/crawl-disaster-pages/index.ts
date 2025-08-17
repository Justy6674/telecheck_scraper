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

    console.log('Starting DisasterAssist full crawl...')

    // Fetch ALL pages from DisasterAssist (up to 50 pages)
    const allDisasters = []
    let pageNum = 0
    const maxPages = 50 // Cover all 38+ pages
    
    while (pageNum < maxPages) {
      const url = pageNum === 0 
        ? 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
        : `https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page=${pageNum}`
      
      console.log(`Fetching page ${pageNum + 1}...`)
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        })
        
        const html = await response.text()
        
        // Extract disaster data using regex patterns
        const tablePattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi
        const rows = html.match(tablePattern) || []
        
        let foundDisasters = 0
        
        for (const row of rows) {
          // Extract AGRN
          const agrnMatch = row.match(/(\d{4})/g)
          const agrn = agrnMatch ? agrnMatch[0] : null
          
          // Extract disaster name
          const nameMatch = row.match(/<a[^>]*>([^<]+)<\/a>/i)
          const name = nameMatch ? nameMatch[1].trim() : null
          
          // Extract dates
          const dateMatch = row.match(/(\d{1,2}\s+\w+\s+\d{4})/g)
          const startDate = dateMatch ? dateMatch[0] : null
          const endDate = dateMatch && dateMatch[1] ? dateMatch[1] : null
          
          // Extract state
          const stateMatch = row.match(/(NSW|VIC|QLD|SA|WA|TAS|NT|ACT|New South Wales|Victoria|Queensland|South Australia|Western Australia|Tasmania|Northern Territory|Australian Capital Territory)/i)
          const state = stateMatch ? stateMatch[1] : null
          
          if (agrn && name && state) {
            allDisasters.push({
              agrn: `AGRN-${agrn}`,
              name,
              startDate,
              endDate,
              state: mapStateCode(state),
              disasterType: extractDisasterType(name)
            })
            foundDisasters++
          }
        }
        
        console.log(`Found ${foundDisasters} disasters on page ${pageNum + 1}`)
        
        // If no disasters found, we've reached the end
        if (foundDisasters === 0) {
          console.log('No more disasters found, ending crawl')
          break
        }
        
        pageNum++
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`Error fetching page ${pageNum + 1}:`, error)
        // Continue to next page even if one fails
        pageNum++
      }
    }
    
    console.log(`Total disasters found: ${allDisasters.length}`)
    
    // Now insert all disasters into database
    let inserted = 0
    let errors = 0
    
    // First ensure we have LGAs
    const statesWithDisasters = [...new Set(allDisasters.map(d => d.state))]
    for (const state of statesWithDisasters) {
      await supabase
        .from('lga_registry')
        .upsert({
          lga_code: `${state}000`,
          lga_name: `${state} General`,
          state_code: state,
          state_name: getStateName(state)
        }, { onConflict: 'lga_code' })
    }
    
    // Insert disasters
    for (const disaster of allDisasters) {
      try {
        const { error } = await supabase
          .from('disaster_declarations')
          .insert({
            agrn_reference: disaster.agrn,
            disaster_type: disaster.disasterType,
            declaration_date: parseDate(disaster.startDate),
            expiry_date: disaster.endDate ? parseDate(disaster.endDate) : null,
            declaration_status: disaster.endDate ? 'expired' : 'active',
            severity_level: 3,
            state_code: disaster.state,
            lga_code: `${disaster.state}000`, // General LGA for state
            description: disaster.name,
            declaration_authority: 'Australian Government',
            verification_url: `https://www.disasterassist.gov.au/find-a-disaster/disaster/${disaster.agrn.replace('AGRN-', '')}`,
            data_source: 'disasterassist.gov.au',
            source_system: 'DisasterAssist',
            last_sync_timestamp: new Date().toISOString()
          })
        
        if (error && !error.message.includes('duplicate')) {
          console.error(`Error inserting ${disaster.agrn}:`, error)
          errors++
        } else {
          inserted++
        }
      } catch (err) {
        console.error(`Failed to insert ${disaster.agrn}:`, err)
        errors++
      }
    }
    
    // Create copyable snippet for practitioners
    const snippet = `PATIENT IN DECLARED DISASTER AREA
As per current Medicare Benefits Schedule (MBS) legislation and DisasterAssist registry:
- Patient postcode is within an active disaster declaration zone
- AGRN reference available for audit compliance
- Telehealth services are eligible for Medicare rebate under disaster exemption
- Verification URL: https://www.disasterassist.gov.au/find-a-disaster/australian-disasters
- Practitioner should document: AGRN reference, disaster type, and verification date
- For audit: Services provided under MBS disaster telehealth provisions`

    return new Response(
      JSON.stringify({ 
        success: true,
        totalFound: allDisasters.length,
        inserted,
        errors,
        message: `Crawled ${pageNum} pages, found ${allDisasters.length} disasters`,
        practitionerSnippet: snippet,
        activeDisasters: allDisasters.filter(d => !d.endDate).length,
        states: statesWithDisasters
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Crawl error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function mapStateCode(state: string): string {
  const stateMap: Record<string, string> = {
    'new south wales': 'NSW',
    'nsw': 'NSW',
    'victoria': 'VIC',
    'vic': 'VIC',
    'queensland': 'QLD',
    'qld': 'QLD',
    'south australia': 'SA',
    'sa': 'SA',
    'western australia': 'WA',
    'wa': 'WA',
    'tasmania': 'TAS',
    'tas': 'TAS',
    'northern territory': 'NT',
    'nt': 'NT',
    'australian capital territory': 'ACT',
    'act': 'ACT'
  }
  return stateMap[state.toLowerCase()] || state.toUpperCase().substring(0, 3)
}

function getStateName(code: string): string {
  const names: Record<string, string> = {
    'NSW': 'New South Wales',
    'VIC': 'Victoria',
    'QLD': 'Queensland',
    'SA': 'South Australia',
    'WA': 'Western Australia',
    'TAS': 'Tasmania',
    'NT': 'Northern Territory',
    'ACT': 'Australian Capital Territory'
  }
  return names[code] || code
}

function extractDisasterType(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('flood')) return 'flood'
  if (lower.includes('fire') || lower.includes('bushfire')) return 'bushfire'
  if (lower.includes('cyclone')) return 'cyclone'
  if (lower.includes('storm')) return 'flood'
  if (lower.includes('drought')) return 'drought'
  return 'other'
}

function parseDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  try {
    // Parse "31 July 2025" format
    const parts = dateStr.split(' ')
    if (parts.length === 3) {
      const months: Record<string, string> = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      }
      const month = months[parts[1].toLowerCase()] || '01'
      const day = parts[0].padStart(2, '0')
      const year = parts[2]
      return `${year}-${month}-${day}`
    }
    return new Date().toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}