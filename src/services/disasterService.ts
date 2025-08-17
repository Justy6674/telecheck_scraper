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

export async function verifyPostcode(postcode: string): Promise<VerificationResult> {
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
  
  // Step 2: Check for active disasters in this LGA - AUTHORITATIVE SOURCES ONLY
  const { data: disasters, error: disasterError } = await supabase
    .from('disaster_declarations')
    .select('*')
    .eq('lga_code', postcodeData.lgas.lga_code)
    .eq('declaration_status', 'active')
    .in('source_system', ['DisasterAssist', 'State_NSW', 'State_VIC', 'State_QLD', 'State_WA', 'State_SA', 'State_TAS', 'State_NT', 'State_ACT'])
    .not('postcodes', 'is', null) // Only include entries with real postcode data
    .not('description', 'ilike', '%mock%') // Exclude any mock descriptions
    .not('description', 'ilike', '%test%'); // Exclude any test descriptions
  
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