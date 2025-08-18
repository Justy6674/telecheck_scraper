import { supabase } from '@/integrations/supabase/client';

export async function getDashboardStats() {
  try {
    // Get total active disasters
    const { count: activeDisasters } = await supabase
      .from('disaster_declarations')
      .select('*', { count: 'exact', head: true })
      .eq('declaration_status', 'active');
    
    // Get total LGAs affected (need to query and count unique)
    const { data: disasters } = await supabase
      .from('disaster_declarations')
      .select('affected_areas')
      .eq('declaration_status', 'active');
    
    const uniqueLGAs = new Set();
    disasters?.forEach(d => {
      if (d.affected_areas && typeof d.affected_areas === 'object' && 'all_lgas' in d.affected_areas) {
        const allLgas = (d.affected_areas as any).all_lgas;
        if (Array.isArray(allLgas)) {
          allLgas.forEach((lga: string) => uniqueLGAs.add(lga));
        }
      }
    });
    
    // Get states with active disasters
    const { data: states } = await supabase
      .from('disaster_declarations')
      .select('state_code')
      .eq('declaration_status', 'active');
    
    const uniqueStates = new Set(states?.map(s => s.state_code));
    
    // Get today's verifications
    const today = new Date().toISOString().split('T')[0];
    const { count: todayVerifications } = await supabase
      .from('postcode_verifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);
    
    return {
      activeDisasters: activeDisasters || 0,
      affectedLGAs: uniqueLGAs.size,
      statesAffected: uniqueStates.size,
      verificationsToday: todayVerifications || 0
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      activeDisasters: 0,
      affectedLGAs: 0,
      statesAffected: 0,
      verificationsToday: 0
    };
  }
}