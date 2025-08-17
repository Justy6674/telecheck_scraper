import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATE_SOURCES = {
  NSW: {
    url: 'https://emergencymanagement.nsw.gov.au/en/disasters',
    name: 'NSW Emergency Management'
  },
  VIC: {
    url: 'https://www.vic.gov.au/emergencies',
    name: 'Emergency Management Victoria'
  },
  QLD: {
    url: 'https://disaster.qld.gov.au',
    name: 'Queensland Disaster Management'
  },
  WA: {
    url: 'https://emergency.wa.gov.au',
    name: 'Emergency WA'
  },
  SA: {
    url: 'https://www.sa.gov.au/topics/emergencies-and-safety',
    name: 'South Australia Emergency'
  },
  TAS: {
    url: 'https://www.ses.tas.gov.au',
    name: 'Tasmania SES'
  },
  NT: {
    url: 'https://securent.nt.gov.au',
    name: 'Northern Territory Emergency'
  },
  ACT: {
    url: 'https://esa.act.gov.au',
    name: 'ACT Emergency Services'
  }
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

    const { stateCode } = await req.json()
    const targetStates = stateCode ? [stateCode] : Object.keys(STATE_SOURCES)

    console.log(`Starting state declarations sync for: ${targetStates.join(', ')}`)

    const results = []

    for (const state of targetStates) {
      const source = STATE_SOURCES[state as keyof typeof STATE_SOURCES]
      if (!source) continue

      console.log(`Syncing ${state} from ${source.url}`)

      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        })

        if (!response.ok) {
          throw new Error(`${state} fetch failed: ${response.status}`)
        }

        const html = await response.text()
        console.log(`Fetched ${html.length} characters from ${state}`)

        // Simple pattern matching for emergency declarations
        // In production, each state would have custom parsing logic
        const emergencyKeywords = ['emergency', 'disaster', 'flood', 'fire', 'cyclone', 'storm']
        const declarations = []

        // Look for emergency/disaster content
        for (const keyword of emergencyKeywords) {
          const regex = new RegExp(`${keyword}[^.]{0,200}`, 'gi')
          const matches = html.match(regex) || []
          
          if (matches.length > 0) {
            // Create a declaration entry
            declarations.push({
              disaster_type: keyword,
              declaration_date: new Date().toISOString(),
              declaration_status: 'active',
              declaration_authority: source.name,
              source_system: `State_${state}`,
              source_url: source.url,
              data_source: source.url,
              state_code: state,
              lga_code: `${state}001`, // Mock LGA code
              description: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} declaration from ${source.name}`,
              postcodes: [], // Would be populated from LGA mapping
              verification_url: source.url,
              last_sync_timestamp: new Date().toISOString(),
              severity_level: 3
            })
          }
        }

        console.log(`Found ${declarations.length} potential declarations for ${state}`)

        // Insert declarations
        let insertedCount = 0
        for (const declaration of declarations.slice(0, 5)) { // Limit to prevent spam
          const { error } = await supabase
            .from('disaster_declarations')
            .upsert(declaration, { 
              onConflict: 'source_url,disaster_type,state_code',
              ignoreDuplicates: true 
            })

          if (!error) {
            insertedCount++
          }
        }

        results.push({
          state,
          source: source.name,
          url: source.url,
          declarations_found: declarations.length,
          inserted: insertedCount
        })

      } catch (error) {
        console.error(`Error syncing ${state}:`, error)
        results.push({
          state,
          source: source.name,
          url: source.url,
          error: error.message,
          inserted: 0
        })
      }
    }

    // Log the sync operation
    await supabase
      .from('data_import_logs')
      .insert({
        import_type: 'state_declarations_sync',
        source_url: targetStates.map(s => STATE_SOURCES[s as keyof typeof STATE_SOURCES]?.url).join(';'),
        records_imported: results.reduce((sum, r) => sum + (r.inserted || 0), 0),
        import_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          states_synced: targetStates,
          results: results,
          sync_timestamp: new Date().toISOString()
        }
      })

    console.log(`✓ State declarations sync completed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        total_inserted: results.reduce((sum, r) => sum + (r.inserted || 0), 0),
        attribution: 'Data sourced from State and Territory Emergency Management agencies'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('State declarations sync error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        attribution: 'Data sourced from State and Territory Emergency Management agencies'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})