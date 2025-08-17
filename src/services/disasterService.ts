import { supabase } from '@/integrations/supabase/client';

export interface VerificationResult {
  postcode: string;
  suburb: string;
  lga: {
    id: number;
    code: string;
    name: string;
    population: number | null;
  } | null;
  inDisasterZone: boolean;
  disasters: Array<{
    id: string;
    type: string;
    description: string;
    authority: string;
    severity: number;
    startDate?: string;
    endDate?: string;
    agrn?: string;
    verificationUrl?: string;
    source?: string;
    status?: string;
  }>;
  verifiedAt: string;
  source: string;
  confidence: string;
  liveVerificationNotes?: string;
  copyableText?: string;
}

// Enhanced verification with live source checking
export async function verifyPostcode(postcode: string, asOfDate?: string, liveCheck = false): Promise<VerificationResult> {
  console.log(`Verifying postcode ${postcode} with live check: ${liveCheck}`)
  
  try {
    // Use live verification function if requested
    if (liveCheck) {
      const response = await supabase.functions.invoke('live-disaster-check', {
        body: { 
          postcode, 
          serviceDate: asOfDate, 
          recheckSources: true 
        }
      })

      if (response.error) {
        throw new Error(`Live check failed: ${response.error.message}`)
      }

      const liveResult = response.data
      return {
        postcode: liveResult.postcode,
        suburb: '', // Will be filled from live result if needed
        lga: {
          id: 0, // Placeholder
          code: liveResult.lga.code,
          name: liveResult.lga.name,
          population: null
        },
        inDisasterZone: liveResult.inDisasterZone,
        disasters: liveResult.disasters.map((d: any) => ({
          id: d.agrn,
          type: d.type,
          description: d.name,
          authority: d.authority,
          severity: 3,
          startDate: d.startDate,
          endDate: d.endDate,
          agrn: d.agrn,
          verificationUrl: d.verificationUrl,
          source: 'disasterassist.gov.au'
        })),
        verifiedAt: new Date().toISOString(),
        source: 'Disaster Assist (Live Check)',
        confidence: 'highest',
        liveVerificationNotes: liveResult.verificationNotes,
        copyableText: liveResult.copyableText
      }
    }

    // Standard database lookup
    const { data: postcodeData, error: postcodeError } = await supabase
      .from('postcodes')
      .select(`
        id,
        postcode,
        suburb,
        lgas!inner(
          id,
          lga_code,
          name,
          population
        )
      `)
      .eq('postcode', postcode)
      .single()

    if (postcodeError || !postcodeData) {
      throw new Error(`Postcode ${postcode} not found in Australian postal database`)
    }

    const lga = postcodeData.lgas
    const checkDate = asOfDate ? new Date(asOfDate) : new Date()
    
    console.log(`Found LGA: ${lga.name} (${lga.lga_code})`)

    // Query for active disasters from Disaster Assist
    const { data: disasters, error: disasterError } = await supabase
      .from('disaster_declarations')
      .select('*')
      .eq('lga_code', lga.lga_code)
      .eq('data_source', 'disasterassist.gov.au')
      .lte('declaration_date', checkDate.toISOString())
      .or(`expiry_date.is.null,expiry_date.gte.${checkDate.toISOString()}`)
      .order('declaration_date', { ascending: false })

    if (disasterError) {
      console.error('Error querying disasters:', disasterError)
      throw new Error('Failed to query disaster declarations')
    }

    console.log(`Found ${disasters?.length || 0} relevant disaster declarations`)

    const inDisasterZone = disasters && disasters.length > 0
    
    // Format disasters for response
    const formattedDisasters = disasters?.map(d => ({
      id: d.id,
      type: d.disaster_type,
      description: d.description || `${d.disaster_type} disaster`,
      authority: d.declaration_authority,
      severity: d.severity_level || 3,
      startDate: d.declaration_date,
      endDate: d.expiry_date,
      agrn: d.agrn_reference,
      verificationUrl: d.verification_url || 'https://www.disasterassist.gov.au',
      source: d.data_source || 'disasterassist.gov.au',
      status: d.expiry_date ? 'Closed' : 'Open'
    })) || []

    // Record verification for audit
    await supabase
      .from('postcode_verifications')
      .insert({
        postcode: postcode,
        suburb: postcodeData.suburb,
        lga_id: lga.id,
        is_disaster_zone: !!inDisasterZone,
        verification_method: 'disaster_assist_lookup',
        declaration_reference: formattedDisasters.map(d => d.agrn).join(', '),
        declaration_authority: 'Disaster Assist',
        data_sources: {
          primary: 'disasterassist.gov.au',
          disaster_count: formattedDisasters.length,
          verification_timestamp: new Date().toISOString()
        }
      })

    return {
      postcode,
      suburb: postcodeData.suburb || '',
      lga: {
        id: lga.id,
        code: lga.lga_code,
        name: lga.name,
        population: lga.population
      },
      inDisasterZone: !!inDisasterZone,
      disasters: formattedDisasters,
      verifiedAt: new Date().toISOString(),
      source: 'Disaster Assist (disasterassist.gov.au)',
      confidence: 'high'
    }

  } catch (error) {
    console.error('Error in disaster verification:', error)
    throw error
  }
}

export async function liveVerifyPostcode(postcode: string, serviceDate?: string): Promise<any> {
  try {
    console.log(`Starting live verification for postcode: ${postcode}`);
    
    const { data, error } = await supabase.functions.invoke('live-disaster-check', {
      body: { postcode, serviceDate }
    });

    if (error) {
      console.error('Live verification function error:', error);
      throw error;
    }
    
    console.log('Live verification result:', data);
    return data;
  } catch (error) {
    console.error('Live verification error:', error);
    
    // Fallback: try direct disaster assist check
    try {
      console.log('Attempting fallback verification...');
      const fallbackResult = await fallbackDisasterCheck(postcode);
      return fallbackResult;
    } catch (fallbackError) {
      console.error('Fallback verification also failed:', fallbackError);
      throw error;
    }
  }
}

async function fallbackDisasterCheck(postcode: string): Promise<any> {
  // Emergency fallback - check if there are ANY active disasters and assume risk
  const { data: anyActiveDisasters } = await supabase
    .from('disaster_declarations')
    .select('*')
    .eq('declaration_status', 'active')
    .limit(1);

  // Get postcode info
  const { data: postcodeData } = await supabase
    .from('postcodes')
    .select(`
      *,
      lgas:primary_lga_id (
        name,
        lga_code,
        states_territories:state_territory_id (
          code,
          name
        )
      )
    `)
    .eq('postcode', postcode)
    .single();

  const hasActiveDisasters = anyActiveDisasters && anyActiveDisasters.length > 0;

  return {
    postcode,
    isDisasterZone: hasActiveDisasters, // Conservative approach
    disasters: anyActiveDisasters || [],
    lgaName: postcodeData?.lgas?.name || 'Unknown',
    state: postcodeData?.lgas?.states_territories?.code || 'Unknown',
    confidence: 'low',
    source: 'fallback',
    lastUpdated: new Date().toISOString(),
    note: hasActiveDisasters 
      ? 'Active disasters detected in Australia - telehealth exemption may apply'
      : 'No active disasters detected - standard rules apply'
  };
}

export async function getActiveDisasters() {
  const { data, error } = await supabase
    .from('disaster_declarations')
    .select(`
      *,
      lgas!disaster_declarations_lga_code_fkey(
        name,
        population
      )
    `)
    .eq('declaration_status', 'active')
    .order('declaration_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getLGAStats() {
  const { data, error } = await supabase
    .from('lgas')
    .select('*', { count: 'exact' });
  
  if (error) throw error;
  return data;
}

export async function getPostcodeStats() {
  const { data, error } = await supabase
    .from('postcodes')
    .select('*', { count: 'exact' });
  
  if (error) throw error;
  return data;
}