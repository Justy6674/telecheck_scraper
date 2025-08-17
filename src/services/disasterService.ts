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
      verification_timestamp: new Date().toISOString(),
      source: 'WEB'
    });
  
  return {
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