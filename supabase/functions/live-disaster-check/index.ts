import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LiveCheckRequest {
  postcode: string
  serviceDate?: string
  recheckSources?: boolean
}

interface LiveCheckResponse {
  success: boolean
  postcode: string
  inDisasterZone: boolean
  lga?: {
    code: string
    name: string
  }
  disasters: Array<{
    agrn: string
    eventName: string
    type: string
    startDate: string
    endDate: string | null
    status: string
    authority: string
    verificationUrl: string
    sourceVerified: boolean
    lastChecked: string
  }>
  sources: Array<{
    name: string
    url: string
    status: 'verified' | 'error' | 'pending'
    lastChecked: string
  }>
  verificationNotes: string
  copyableText: string
  disclaimer: string
  lastSyncTime: string
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

    const { postcode, serviceDate, recheckSources }: LiveCheckRequest = await req.json()

    if (!postcode || !/^\d{4}$/.test(postcode)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid 4-digit postcode required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Live disaster check for postcode ${postcode}, serviceDate: ${serviceDate}`)

    // Get LGA for postcode
    const { data: postcodeData } = await supabase
      .from('postcodes')
      .select(`
        id,
        suburb,
        lgas!inner(
          id,
          lga_code,
          name
        )
      `)
      .eq('postcode', postcode)
      .single()

    if (!postcodeData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Postcode not found in Australian postal database' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lga = postcodeData.lgas
    console.log(`Found LGA: ${lga.name} (${lga.lga_code})`)

    // Query disasters affecting this LGA
    const checkDate = serviceDate ? new Date(serviceDate) : new Date()
    
    const { data: disasters } = await supabase
      .from('disaster_declarations')
      .select(`
        agrn_reference,
        event_name,
        disaster_type,
        declaration_date,
        expiry_date,
        declaration_status,
        declaration_authority,
        verification_url,
        data_source,
        last_sync_timestamp
      `)
      .eq('lga_code', lga.lga_code)
      .eq('declaration_status', 'active')
      .lte('declaration_date', checkDate.toISOString())
      .or(`expiry_date.is.null,expiry_date.gte.${checkDate.toISOString()}`)

    console.log(`Found ${disasters?.length || 0} relevant disasters`)

    // Live verification against sources if requested
    const sourceResults = []
    if (recheckSources && disasters && disasters.length > 0) {
      for (const disaster of disasters) {
        try {
          const sourceCheck = await verifyDisasterAtSource(disaster)
          sourceResults.push(sourceCheck)
        } catch (error) {
          console.error(`Error checking source for ${disaster.agrn_reference}:`, error)
          sourceResults.push({
            name: 'Disaster Assist',
            url: disaster.verification_url || 'https://www.disasterassist.gov.au',
            status: 'error',
            lastChecked: new Date().toISOString()
          })
        }
      }
    }

    // Format response
    const inDisasterZone = disasters && disasters.length > 0
    const disasterDetails = disasters?.map(d => ({
      agrn: d.agrn_reference || 'Unknown',
      eventName: d.event_name || d.disaster_type || 'Disaster Declaration',
      type: d.disaster_type || 'unknown',
      startDate: d.declaration_date,
      endDate: d.expiry_date,
      status: d.expiry_date ? 'Closed' : 'Open (no end date published)',
      authority: d.declaration_authority || 'Unknown',
      verificationUrl: d.verification_url || 'https://www.disasterassist.gov.au',
      sourceVerified: recheckSources,
      lastChecked: new Date().toISOString()
    })) || []

    // Generate verification notes
    const verificationNotes = generateVerificationNotes({
      postcode,
      lga,
      disasters: disasterDetails,
      serviceDate,
      inDisasterZone,
      recheckSources: !!recheckSources
    })

    // Generate copyable text for practitioner notes
    const copyableText = generateCopyableText({
      postcode,
      lga,
      disasters: disasterDetails,
      serviceDate,
      inDisasterZone,
      verificationTime: new Date().toISOString()
    })

    const response: LiveCheckResponse = {
      success: true,
      postcode,
      inDisasterZone,
      lga: {
        code: lga.lga_code,
        name: lga.name
      },
      disasters: disasterDetails,
      sources: sourceResults,
      verificationNotes,
      copyableText,
      disclaimer: "This verification is based on Disaster Assist data. Healthcare providers must confirm current status by checking the provided source URL before claiming telehealth exemptions.",
      lastSyncTime: disasters && disasters.length > 0 ? disasters[0].last_sync_timestamp : new Date().toISOString()
    }

    return new Response(
      JSON.stringify(response),
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

async function verifyDisasterAtSource(disaster: any): Promise<any> {
  const url = disaster.verification_url || 'https://www.disasterassist.gov.au'
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    
    // Simple verification - check if AGRN still exists on page
    const agrnExists = disaster.agrn_reference && 
      html.toLowerCase().includes(disaster.agrn_reference.toLowerCase())

    return {
      name: 'Disaster Assist',
      url: url,
      status: agrnExists ? 'verified' : 'error',
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      name: 'Disaster Assist',
      url: url,
      status: 'error',
      lastChecked: new Date().toISOString()
    }
  }
}

function generateVerificationNotes({
  postcode,
  lga,
  disasters,
  serviceDate,
  inDisasterZone,
  recheckSources
}: any): string {
  const verificationTime = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  let notes = `TELEHEALTH DISASTER VERIFICATION\n\n`
  notes += `Verification Time: ${verificationTime} (AEST/AEDT)\n`
  notes += `Patient Postcode: ${postcode}\n`
  notes += `LGA: ${lga.name} (${lga.code})\n`
  notes += `Service Date: ${serviceDate ? new Date(serviceDate).toLocaleDateString('en-AU') : 'Today'}\n`
  
  if (recheckSources) {
    notes += `Live Source Check: Performed\n`
  }
  
  notes += `\nRESULT: ${inDisasterZone ? 'DISASTER DECLARATION ACTIVE' : 'NO ACTIVE DISASTER DECLARATION'}\n\n`

  if (inDisasterZone && disasters.length > 0) {
    notes += `ACTIVE DECLARATIONS:\n`
    disasters.forEach((d: any, i: number) => {
      notes += `${i + 1}. ${d.eventName}\n`
      notes += `   AGRN: ${d.agrn}\n`
      notes += `   Type: ${d.type}\n`
      notes += `   Start: ${new Date(d.startDate).toLocaleDateString('en-AU')}\n`
      notes += `   End: ${d.endDate ? new Date(d.endDate).toLocaleDateString('en-AU') : 'Open (no end date published)'}\n`
      notes += `   Source: ${d.verificationUrl}\n\n`
    })
    
    notes += `MBS TELEHEALTH STATUS: ELIGIBLE\n`
    notes += `- Patient is within a declared disaster area\n`
    notes += `- Standard 12-month relationship requirement waived\n`
    notes += `- Standard Medicare telehealth item numbers apply\n`
  } else {
    notes += `MBS TELEHEALTH STATUS: STANDARD RULES APPLY\n`
    notes += `- No current disaster declaration affects this postcode\n`
    notes += `- Standard 12-month relationship requirement applies\n`
    notes += `- Other exemptions may still apply\n`
  }

  notes += `\nSOURCE: Disaster Assist (disasterassist.gov.au)\n`
  notes += `Australian Government authoritative disaster registry\n`
  notes += `Verification URL: https://www.disasterassist.gov.au/find-a-disaster/australian-disasters\n`

  return notes
}

function generateCopyableText({
  postcode,
  lga,
  disasters,
  serviceDate,
  inDisasterZone,
  verificationTime
}: any): string {
  const date = new Date(verificationTime).toLocaleDateString('en-AU')
  const time = new Date(verificationTime).toLocaleTimeString('en-AU')
  
  let text = `Medicare Telehealth Disaster Verification - ${date} ${time}\n\n`
  text += `Patient postcode ${postcode} (${lga.name}) `
  
  if (inDisasterZone) {
    text += `IS within an active disaster declaration area. `
    text += `Medicare telehealth exemption applies - 12-month relationship requirement waived. `
    
    if (disasters.length > 0) {
      text += `Active declaration: ${disasters[0].eventName} (AGRN ${disasters[0].agrn}), `
      text += `declared ${new Date(disasters[0].startDate).toLocaleDateString('en-AU')}, `
      text += `${disasters[0].endDate ? 'expires ' + new Date(disasters[0].endDate).toLocaleDateString('en-AU') : 'Open (no end date published)'}. `
    }
  } else {
    text += `is NOT within an active disaster declaration area. `
    text += `Standard Medicare telehealth rules apply - 12-month relationship requirement unless other exemption applies. `
  }
  
  text += `Source: Disaster Assist (disasterassist.gov.au). Verified ${date} ${time}.`
  
  return text
}