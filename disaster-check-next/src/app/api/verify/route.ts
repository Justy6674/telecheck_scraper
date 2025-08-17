import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const postcode = searchParams.get('postcode');
  
  if (!postcode || !/^\d{4}$/.test(postcode)) {
    return NextResponse.json({ error: 'Invalid postcode' }, { status: 400 });
  }
  
  try {
    // Step 1: Find LGA(s) for this postcode
    const { data: postcodeData, error: postcodeError } = await supabase
      .from('postcodes')
      .select(`
        postcode,
        suburb,
        primary_lga_id,
        lgas!inner(
          lga_code,
          name
        )
      `)
      .eq('postcode', postcode)
      .single();
    
    if (postcodeError || !postcodeData) {
      return NextResponse.json({ 
        postcode,
        inDisasterZone: false,
        message: 'Postcode not found in database',
        error: postcodeError?.message
      });
    }
    
    // Step 2: Check for active disasters in this LGA
    const { data: disasters, error: disasterError } = await supabase
      .from('disaster_declarations')
      .select('*')
      .eq('lga_code', postcodeData.lgas.lga_code)
      .eq('declaration_status', 'active');
    
    if (disasterError) {
      throw disasterError;
    }
    
    const inDisasterZone = disasters && disasters.length > 0;
    
    // Step 3: Record verification
    await supabase
      .from('postcode_verifications')
      .insert({
        postcode,
        lga_code: postcodeData.lgas.lga_code,
        is_disaster_zone: inDisasterZone,
        disaster_count: disasters?.length || 0,
        verification_timestamp: new Date(),
        source: 'API'
      });
    
    return NextResponse.json({
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
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      error: 'Failed to verify postcode',
      details: error
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Batch verification endpoint
  const { postcodes } = await request.json();
  
  if (!Array.isArray(postcodes) || postcodes.length === 0) {
    return NextResponse.json({ error: 'Invalid postcodes array' }, { status: 400 });
  }
  
  const results = [];
  
  for (const postcode of postcodes.slice(0, 100)) { // Limit to 100 per batch
    // Reuse GET logic
    const response = await GET(new NextRequest(`${request.url}?postcode=${postcode}`));
    const data = await response.json();
    results.push(data);
  }
  
  return NextResponse.json({
    verified: results.length,
    results
  });
}