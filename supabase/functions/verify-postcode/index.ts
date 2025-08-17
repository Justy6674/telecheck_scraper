import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const postcode = url.searchParams.get('postcode')
    
    if (!postcode || !/^\d{4}$/.test(postcode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid postcode' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Find LGA for this postcode
    const { data: postcodeData, error: postcodeError } = await supabase
      .from('postcodes')
      .select(`
        postcode,
        suburb,
        lgas!postcodes_primary_lga_id_fkey(
          lga_code,
          name
        )
      `)
      .eq('postcode', postcode)
      .single()
    
    if (postcodeError || !postcodeData) {
      return new Response(
        JSON.stringify({ 
          postcode,
          inDisasterZone: false,
          message: 'Postcode not found in database',
          error: postcodeError?.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }
    
    // Step 2: Check for active disasters in this LGA
    const { data: disasters, error: disasterError } = await supabase
      .from('disaster_declarations')
      .select('*')
      .eq('lga_code', postcodeData.lgas.lga_code)
      .eq('declaration_status', 'active')
    
    if (disasterError) {
      throw disasterError
    }
    
    const inDisasterZone = disasters && disasters.length > 0
    
    // Step 3: Record verification
    await supabase
      .from('postcode_verifications')
      .insert({
        postcode,
        lga_code: postcodeData.lgas.lga_code,
        is_disaster_zone: inDisasterZone,
        disaster_count: disasters?.length || 0,
        verification_timestamp: new Date().toISOString(),
        source: 'API'
      })
    
    return new Response(
      JSON.stringify({
        postcode,
        suburb: postcodeData.suburb,
        lga: {
          code: postcodeData.lgas.lga_code,
          name: postcodeData.lgas.name
        },
        inDisasterZone,
        disasters: disasters?.map(d => ({
          type: d.disaster_type,
          severity: d.severity_level,
          authority: d.declaration_authority,
          description: d.description,
          declaredDate: d.declaration_date
        })) || [],
        verifiedAt: new Date().toISOString(),
        message: inDisasterZone 
          ? `This postcode IS in a declared disaster zone (${disasters.length} active disaster${disasters.length > 1 ? 's' : ''})` 
          : 'This postcode is NOT in a declared disaster zone'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
    
  } catch (error) {
    console.error('Verification error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to verify postcode',
        details: error.message
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})