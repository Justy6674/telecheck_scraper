import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { lgaCode, forceRefresh = false } = await req.json()

    if (!lgaCode) {
      throw new Error('LGA code is required')
    }

    console.log(`Fetching NEMA LGA profile for: ${lgaCode}`)

    // Check if we already have a recent profile (unless force refresh)
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('nema_lga_profiles')
        .select('*')
        .eq('lga_code', lgaCode)
        .gte('fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 hours
        .single()

      if (existing) {
        console.log(`Using cached profile for ${lgaCode}`)
        return new Response(
          JSON.stringify({ success: true, data: existing, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Construct NEMA profile URL
    const nemaUrl = `https://www.nema.gov.au/about-us/governance-and-reporting/data/download-lga-profile/${lgaCode.toLowerCase()}`
    
    console.log(`Fetching from NEMA: ${nemaUrl}`)

    // Fetch the Word document
    const response = await fetch(nemaUrl, {
      headers: {
        'User-Agent': 'DisasterCheck-Australia/1.0 (Healthcare Compliance System)',
        'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,*/*'
      }
    })

    if (!response.ok) {
      throw new Error(`NEMA profile fetch failed: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const isWordDoc = contentType.includes('application/vnd.openxmlformats') || 
                     contentType.includes('application/msword') ||
                     contentType.includes('application/octet-stream')

    if (!isWordDoc) {
      console.warn(`Unexpected content type: ${contentType}`)
    }

    // Get the document as bytes
    const docBytes = await response.arrayBuffer()
    const docSize = docBytes.byteLength

    console.log(`Downloaded ${docSize} bytes from NEMA`)

    // Store in Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `nema-lga-${lgaCode.toLowerCase()}-${timestamp}.docx`
    const storagePath = `nema-profiles/${filename}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('disaster-documents')
      .upload(storagePath, new Uint8Array(docBytes), {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      throw new Error(`Failed to store document: ${uploadError.message}`)
    }

    // Extract basic metadata (simple text analysis since we can't easily parse Word docs in Deno)
    // We'll store the raw document and extract key fields from the URL response or filename patterns
    const extractedData = {
      total_area: null,
      population: null,
      major_town: null,
      median_age: null,
      unemployment_rate: null,
      disaster_history: [],
      current_season_payments: null,
      report_generated_date: new Date().toISOString() // Approximation
    }

    // Store profile metadata in database
    const profileData = {
      lga_code: lgaCode.toUpperCase(),
      storage_path: storagePath,
      document_size: docSize,
      content_type: contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fetched_at: new Date().toISOString(),
      nema_url: nemaUrl,
      extracted_data: extractedData,
      attribution: 'Data sourced from National Emergency Management Agency (NEMA) under Creative Commons Attribution 4.0 International license'
    }

    const { data: insertData, error: insertError } = await supabase
      .from('nema_lga_profiles')
      .upsert(profileData, { onConflict: 'lga_code' })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    console.log(`✓ NEMA profile stored for ${lgaCode}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: insertData,
        cached: false,
        attribution: profileData.attribution
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('NEMA profile fetch error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        attribution: 'Data sourced from National Emergency Management Agency (NEMA) under Creative Commons Attribution 4.0 International license'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})