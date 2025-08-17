import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

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
  lgaNames: string[]
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
        const lgaMappings = await mapLgasToCode(supabase, disaster.lgaNames)
        
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
  console.log('Starting comprehensive DisasterAssist crawl...')
  
  const disasters: DisasterEvent[] = []
  let currentPage = 1
  const maxPages = 68 // Known max from user requirements
  
  while (currentPage <= maxPages) {
    console.log(`Crawling page ${currentPage} of ${maxPages}...`)
    
    try {
      // Build the URL for current page
      const baseUrl = 'https://www.disasterassist.gov.au/find-a-disaster/australian-disasters'
      const pageUrl = currentPage === 1 ? baseUrl : `${baseUrl}?page=${currentPage}`
      
      const response = await fetch(pageUrl, {
        headers: { 
          'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        console.error(`Failed to fetch page ${currentPage}: ${response.status}`)
        break
      }
      
      const html = await response.text()
      
      // Extract disaster links from this page
      const pageLinks = extractDisasterLinksFromPage(html)
      console.log(`Page ${currentPage} found ${pageLinks.length} disaster links`)
      
      if (pageLinks.length === 0) {
        console.log(`No links found on page ${currentPage}, stopping pagination`)
        break
      }
      
      // Process each disaster link on this page
      for (const link of pageLinks) {
        try {
          const disaster = await crawlDisasterDetail(link)
          if (disaster) {
            disasters.push(disaster)
            console.log(`Processed disaster: ${disaster.eventName} (AGRN: ${disaster.agrn})`)
          }
        } catch (error) {
          console.error(`Error crawling ${link}:`, error)
        }
      }
      
      currentPage++
      
      // Add small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`Error crawling page ${currentPage}:`, error)
      break
    }
  }

  console.log(`Crawl completed: ${disasters.length} disasters found across ${currentPage - 1} pages`)
  return disasters
}

function extractDisasterLinksFromPage(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) return []
  
  // Updated selectors based on current DisasterAssist structure
  const selectors = [
    'a[href*="/Pages/disasters/"]',
    'a[href*="/disaster/"]', 
    'a[href*="AGRN"]',
    'a[href*=".aspx"]',
    '.views-row a',
    '.view-content a',
    '.field-content a',
    'table a',
    '.disaster-list a'
  ]
  
  let allLinks: string[] = []
  
  for (const selector of selectors) {
    try {
      const anchors = Array.from(doc.querySelectorAll(selector)) as any[]
      const links = anchors
        .map((a: any) => a.getAttribute('href'))
        .filter(Boolean)
        .filter((url: string) => 
          url.includes('disaster') || 
          url.includes('AGRN') || 
          url.includes('/Pages/disasters/') ||
          /agrn-\d+/i.test(url)
        )
        .map((url: string) => url.startsWith('http') ? url : `https://www.disasterassist.gov.au${url}`)
      
      allLinks = [...allLinks, ...links]
    } catch (error) {
      console.error(`Error with selector ${selector}:`, error)
    }
  }
  
  // Regex fallback for disaster links
  const regexPatterns = [
    /href="([^"]*\/Pages\/disasters\/[^"]*\.aspx)"/gi,
    /href="([^"]*disaster[^"]*\.aspx)"/gi,
    /href="([^"]*agrn-\d+[^"]*)"/gi
  ]
  
  for (const pattern of regexPatterns) {
    const matches = html.match(pattern) || []
    const regexLinks = matches
      .map(match => match.replace(/href="([^"]*)"/, '$1'))
      .map(url => url.startsWith('http') ? url : `https://www.disasterassist.gov.au${url}`)
    
    allLinks = [...allLinks, ...regexLinks]
  }
  
  // Remove duplicates and validate
  const uniqueLinks = [...new Set(allLinks)]
    .filter(url => url.includes('disasterassist.gov.au'))
    .filter(url => !url.includes('#'))
    .filter(url => !url.includes('javascript:'))
  
  return uniqueLinks
}

function extractLinksAlternative(html: string): string[] {
  // Regex fallback for current page structure
  const patterns = [
    /href="([^"]*\/Pages\/disasters\/[^"]*\.aspx)"/gi,
    /href="([^"]*disaster[^"]*\.aspx)"/gi,
    /href="([^"]*AGRN[^"]*\.aspx)"/gi
  ]
  
  let allMatches: string[] = []
  
  for (const pattern of patterns) {
    const matches = html.match(pattern) || []
    const links = matches
      .map(match => match.replace(/href="([^"]*)"/, '$1'))
      .map(url => url.startsWith('http') ? url : `https://www.disasterassist.gov.au${url}`)
    
    allMatches = [...allMatches, ...links]
  }
  
  const uniqueLinks = [...new Set(allMatches)]
  console.log(`Alternative extraction found ${uniqueLinks.length} links`)
  return uniqueLinks
}

function extractLinksFromSitemap(xml: string): string[] {
  const urlPattern = /<loc>(.*?\/Pages\/disasters\/.*?\.aspx)<\/loc>/gi
  const matches = xml.match(urlPattern) || []
  
  const links = matches
    .map(match => match.replace(/<loc>(.*?)<\/loc>/, '$1'))
    .filter((url, index, array) => array.indexOf(url) === index)
  
  console.log(`Sitemap extraction found ${links.length} links`)
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
    
    // Extract state from URL path or content
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
    } else {
      // Try to extract state from content
      const stateContentMatch = html.match(/State[:\s]*(NSW|VIC|QLD|WA|SA|TAS|NT|ACT|New South Wales|Victoria|Queensland|Western Australia|South Australia|Tasmania|Northern Territory|Australian Capital Territory)/i)
      if (stateContentMatch) {
        const stateText = stateContentMatch[1].toUpperCase()
        const stateNameMap: {[key: string]: string} = {
          'NEW SOUTH WALES': 'NSW',
          'VICTORIA': 'VIC',
          'QUEENSLAND': 'QLD',
          'WESTERN AUSTRALIA': 'WA',
          'SOUTH AUSTRALIA': 'SA',
          'TASMANIA': 'TAS',
          'NORTHERN TERRITORY': 'NT',
          'AUSTRALIAN CAPITAL TERRITORY': 'ACT'
        }
        state = stateNameMap[stateText] || stateText.substring(0, 3)
      }
    }
    
    // Extract LGA information from content
    const lgaNames = extractLGAsFromPage(html, new DOMParser().parseFromString(html, 'text/html'))

    console.log(`Parsed disaster: ${name} (AGRN: ${agrn}) - ${state} - Active: ${isOngoing}`)

    return {
      agrn: agrn,
      eventName: name,
      startDate: startDateMatch ? parseAustralianDate(startDateMatch[1]) : new Date().toISOString(),
      endDate: endDateMatch ? parseAustralianDate(endDateMatch[1]) : null,
      status: isOngoing ? 'Open' : 'Closed',
      state: state,
      lgaNames: lgaNames.length > 0 ? lgaNames : [`${state}001`], // fallback LGA code
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

function extractLGAsFromPage(html: string, doc?: any): string[] {
  const lgaNames: string[] = []
  
  // Method 1: DOM-based extraction if document is available
  if (doc) {
    const lgaSelectors = [
      '[class*="lga"]', '[id*="lga"]', 
      '[class*="council"]', '[id*="council"]',
      'table td', 'ul li', '.content-area p'
    ]
    
    for (const selector of lgaSelectors) {
      const elements = doc.querySelectorAll(selector)
      for (const element of elements) {
        const text = element.textContent || ''
        const lgaMatches = extractLGANamesFromText(text)
        lgaNames.push(...lgaMatches)
      }
    }
  }
  
  // Method 2: Regex-based extraction from HTML
  const lgaPatterns = [
    /Local Government Area[s]?[:\s]*(.*?)(?:\n|<|\.)/gi,
    /LGA[s]?[:\s]*(.*?)(?:\n|<|\.)/gi,
    /Council[s]?[:\s]*(.*?)(?:\n|<|\.)/gi,
    /(?:City|Shire|Council|Region) of ([^<\n,.]+)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:City|Shire|Council)/gi,
    /Affected areas?[:\s]*(.*?)(?:\n|<|\.)/gi
  ]
  
  for (const pattern of lgaPatterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const text = match[1] || match[0]
      const names = extractLGANamesFromText(text)
      lgaNames.push(...names)
    }
  }
  
  // Remove duplicates and filter valid names
  const uniqueLGAs = [...new Set(lgaNames)]
    .filter(name => name.length > 2 && name.length < 50)
    .filter(name => !/^(and|or|the|of|in|on|at|to|for|with)$/i.test(name))
  
  console.log(`Extracted ${uniqueLGAs.length} LGA names: ${uniqueLGAs.slice(0, 5).join(', ')}${uniqueLGAs.length > 5 ? '...' : ''}`)
  return uniqueLGAs
}

function extractLGANamesFromText(text: string): string[] {
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/[:\-]/g, ' ')
  
  // Split by common separators and clean
  const potential = cleaned.split(/[,;]/)
    .map(name => name.trim())
    .filter(name => name.length > 2)
    .map(name => name.replace(/^(Local Government Area|LGA|Council|City|Shire|Region)\s+/i, ''))
    .map(name => name.replace(/\s+(Local Government Area|LGA|Council|City|Shire|Region)$/i, ''))
  
  return potential.filter(name => name.length > 2 && name.length < 50)
}