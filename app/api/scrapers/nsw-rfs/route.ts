import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch NSW RFS Major Incidents
    const response = await fetch('https://www.rfs.nsw.gov.au/feeds/majorIncidents.json');
    const data = await response.json();
    
    const disasters = [];
    
    // Process each incident
    for (const feature of data.features || []) {
      const props = feature.properties;
      
      if (props && props.category && props.category !== 'Not Applicable') {
        // Map council areas to LGA codes
        const councilAreas = props.councilArea ? props.councilArea.split(',').map((s: string) => s.trim()) : [];
        
        for (const council of councilAreas) {
          // Look up LGA code from name
          const { data: lga } = await supabase
            .from('lgas')
            .select('lga_code')
            .ilike('name', `%${council}%`)
            .eq('state_territory_id', 1) // NSW
            .single();
          
          if (lga) {
            disasters.push({
              lga_code: lga.lga_code,
              disaster_type: props.category.toLowerCase().includes('fire') ? 'bushfire' : 'other',
              declaration_date: new Date(props.pubDate || props.updated),
              declaration_status: 'active',
              state_code: '1',
              severity_level: props.category === 'Emergency Warning' ? 5 : 3,
              declaration_authority: 'NSW RFS',
              description: props.title,
              source_url: 'https://www.rfs.nsw.gov.au/',
              source_system: 'NSW_RFS_API',
              last_sync_timestamp: new Date()
            });
          }
        }
      }
    }
    
    // Upsert disasters
    if (disasters.length > 0) {
      const { error } = await supabase
        .from('disaster_declarations')
        .upsert(disasters, { 
          onConflict: 'lga_code,disaster_type,declaration_date' 
        });
      
      if (error) throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: disasters.length,
      source: 'NSW RFS'
    });
    
  } catch (error) {
    console.error('NSW RFS scraper error:', error);
    return NextResponse.json({ error: 'Failed to fetch NSW RFS data' }, { status: 500 });
  }
}