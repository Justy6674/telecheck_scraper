import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch VicEmergency incidents
    const response = await fetch('https://data.emergency.vic.gov.au/Show?pageId=getIncidentJSON');
    const data = await response.json();
    
    const disasters = [];
    
    // Process each incident
    for (const incident of data.results || []) {
      if (incident.category1 === 'Emergency' || incident.category1 === 'Watch and Act') {
        // Map location to LGA
        const location = incident.location || '';
        
        // Look up LGA from location name
        const { data: lga } = await supabase
          .from('lgas')
          .select('lga_code')
          .ilike('name', `%${location.split(',')[0]}%`)
          .eq('state_territory_id', 2) // VIC
          .single();
        
        if (lga) {
          disasters.push({
            lga_code: lga.lga_code,
            disaster_type: incident.incidentType?.toLowerCase().includes('fire') ? 'bushfire' : 
                          incident.incidentType?.toLowerCase().includes('flood') ? 'flood' : 'other',
            declaration_date: new Date(incident.created),
            declaration_status: 'active',
            state_code: '2',
            severity_level: incident.category1 === 'Emergency' ? 5 : 3,
            declaration_authority: 'VicEmergency',
            description: incident.incidentName,
            source_url: 'https://emergency.vic.gov.au/',
            source_system: 'VIC_EMERGENCY_API',
            last_sync_timestamp: new Date()
          });
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
      source: 'VicEmergency'
    });
    
  } catch (error) {
    console.error('VicEmergency scraper error:', error);
    return NextResponse.json({ error: 'Failed to fetch VicEmergency data' }, { status: 500 });
  }
}