import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function scrapeNSWRFS(supabase: any) {
  try {
    const response = await fetch('https://www.rfs.nsw.gov.au/feeds/majorIncidents.json')
    const data = await response.json()
    
    const disasters = []
    
    for (const feature of data.features || []) {
      const props = feature.properties
      
      if (props && props.category && props.category !== 'Not Applicable') {
        const councilAreas = props.councilArea ? props.councilArea.split(',').map((s: string) => s.trim()) : []
        
        for (const council of councilAreas) {
          const { data: lga } = await supabase
            .from('lgas')
            .select('lga_code')
            .ilike('name', `%${council}%`)
            .eq('state_territory_id', 1) // NSW
            .single()
          
          if (lga) {
            disasters.push({
              lga_code: lga.lga_code,
              disaster_type: 'bushfire',
              declaration_date: new Date(props.pubDate || props.updated),
              declaration_status: 'active',
              state_code: '1',
              severity_level: props.category === 'Emergency Warning' ? 5 : 3,
              declaration_authority: 'NSW RFS',
              description: props.title,
              source_url: 'https://www.rfs.nsw.gov.au/',
              source_system: 'NSW_RFS_API',
              last_sync_timestamp: new Date()
            })
          }
        }
      }
    }
    
    if (disasters.length > 0) {
      await supabase.from('disaster_declarations').upsert(disasters)
    }
    
    return { source: 'NSW RFS', count: disasters.length }
  } catch (error) {
    console.error('NSW RFS error:', error)
    return { source: 'NSW RFS', error: error.message }
  }
}

async function scrapeVicEmergency(supabase: any) {
  try {
    const response = await fetch('https://data.emergency.vic.gov.au/Show?pageId=getIncidentJSON')
    const data = await response.json()
    
    const disasters = []
    
    for (const incident of data.results || []) {
      if (incident.category1 === 'Emergency' || incident.category1 === 'Watch and Act') {
        const location = incident.location || ''
        
        const { data: lga } = await supabase
          .from('lgas')
          .select('lga_code')
          .ilike('name', `%${location.split(',')[0]}%`)
          .eq('state_territory_id', 2) // VIC
          .single()
        
        if (lga) {
          disasters.push({
            lga_code: lga.lga_code,
            disaster_type: incident.incidentType?.toLowerCase().includes('fire') ? 'bushfire' : 'flood',
            declaration_date: new Date(incident.created),
            declaration_status: 'active',
            state_code: '2',
            severity_level: incident.category1 === 'Emergency' ? 5 : 3,
            declaration_authority: 'VicEmergency',
            description: incident.incidentName,
            source_url: 'https://emergency.vic.gov.au/',
            source_system: 'VIC_EMERGENCY_API',
            last_sync_timestamp: new Date()
          })
        }
      }
    }
    
    if (disasters.length > 0) {
      await supabase.from('disaster_declarations').upsert(disasters)
    }
    
    return { source: 'VicEmergency', count: disasters.length }
  } catch (error) {
    console.error('VicEmergency error:', error)
    return { source: 'VicEmergency', error: error.message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Run all scrapers in parallel
    const results = await Promise.all([
      scrapeNSWRFS(supabase),
      scrapeVicEmergency(supabase)
    ])

    return new Response(
      JSON.stringify({ 
        success: true,
        timestamp: new Date().toISOString(),
        sources: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
    
  } catch (error) {
    console.error('Scraper error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to scrape disasters' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})