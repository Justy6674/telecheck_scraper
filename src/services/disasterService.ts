import { supabase } from '@/integrations/supabase/client';

export interface VerificationResult {
  postcode: string;
  suburb: string;
  lga: {
    code: string;
    name: string;
  };
  inDisasterZone: boolean;
  disasters: Array<{
    type: string;
    severity: number;
    authority: string;
    description: string;
    declaredDate: string;
  }>;
  verifiedAt: string;
  message: string;
}

export async function verifyPostcode(postcode: string, asOfDate?: string): Promise<VerificationResult> {
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
    .single();
  
  if (postcodeError || !postcodeData) {
    throw new Error('Postcode not found');
  }
  
  // Step 2: Check for disasters in this LGA - AUTHORITATIVE SOURCES ONLY
  // Support historical "as-of" date checking
  let disastersQuery = supabase
    .from('disaster_declarations')
    .select('*')
    .eq('lga_code', postcodeData.lgas.lga_code)
    .in('source_system', ['DisasterAssist', 'State_NSW', 'State_VIC', 'State_QLD', 'State_WA', 'State_SA', 'State_TAS', 'State_NT', 'State_ACT'])
    .not('postcodes', 'is', null) // Only include entries with real postcode data
    .not('description', 'ilike', '%mock%') // Exclude any mock descriptions
    .not('description', 'ilike', '%test%'); // Exclude any test descriptions

  if (asOfDate) {
    // Historical check - find declarations that were active on the specified date
    const targetDate = new Date(asOfDate);
    disastersQuery = disastersQuery
      .lte('declaration_date', targetDate.toISOString())
      .or(`expiry_date.is.null,expiry_date.gte.${targetDate.toISOString()}`);
  } else {
    // Current check - only active declarations
    disastersQuery = disastersQuery.eq('declaration_status', 'active');
  }

  const { data: disasters, error: disasterError } = await disastersQuery;
  
  if (disasterError) {
    throw disasterError;
  }
  
  // Data provenance check - ensure all disasters have valid authoritative sources
  const verifiedDisasters = disasters?.filter(d => 
    d.source_system && 
    d.declaration_authority && 
    d.source_url &&
    d.postcodes &&
    d.postcodes.length > 0 &&
    (d.agrn_reference || d.source_system.startsWith('State_')) // Must have AGRN or be from state source
  ) || [];
  
  const inDisasterZone = verifiedDisasters.length > 0;
  
  // Step 3: Record verification
  await supabase
    .from('postcode_verifications')
    .insert({
      postcode,
      lga_code: postcodeData.lgas.lga_code,
      is_disaster_zone: inDisasterZone,
      disaster_count: verifiedDisasters.length,
      verification_timestamp: new Date().toISOString(),
      source: 'WEB',
      data_integrity_verified: true
    });
  
  return {
    postcode,
    suburb: postcodeData.suburb,
    lga: {
      code: postcodeData.lgas.lga_code,
      name: postcodeData.lgas.name
    },
    inDisasterZone,
    disasters: verifiedDisasters.map(d => ({
      type: d.disaster_type,
      severity: d.severity_level,
      authority: d.declaration_authority,
      description: d.description,
      declaredDate: d.declaration_date,
      sourceSystem: d.source_system,
      sourceUrl: d.source_url
    })),
    verifiedAt: new Date().toISOString(),
    message: inDisasterZone 
      ? `✅ VERIFIED: This postcode IS in a declared disaster zone (${verifiedDisasters.length} verified disaster${verifiedDisasters.length > 1 ? 's' : ''})` 
      : '✅ VERIFIED: This postcode is NOT in a declared disaster zone'
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