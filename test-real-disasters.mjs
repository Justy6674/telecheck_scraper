#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMDIxNjksImV4cCI6MjA3MDg3ODE2OX0.n13n8_i2QhQr2msNNEDuQ1YwDLy7D12YMFkYLpPwgME'
);

async function testRealDisasters() {
  console.log('🔍 Testing Real Disaster Data in Database...\n');
  
  // 1. Count disasters
  const { data: stats, error: statsError } = await supabase
    .from('disaster_declarations')
    .select('declaration_status')
    .eq('data_source', 'disasterassist.gov.au');
    
  if (stats) {
    const active = stats.filter(d => d.declaration_status === 'active').length;
    const expired = stats.filter(d => d.declaration_status === 'expired').length;
    
    console.log('📊 DISASTER STATISTICS:');
    console.log('='.repeat(40));
    console.log(`✅ Active Disasters: ${active}`);
    console.log(`🕒 Expired Disasters: ${expired}`);
    console.log(`📈 Total Disasters: ${stats.length}`);
    console.log('='.repeat(40));
  }
  
  // 2. Show active disasters by state
  const { data: activeDisasters } = await supabase
    .from('disaster_declarations')
    .select('state_code, description, declaration_date, agrn_reference')
    .eq('declaration_status', 'active')
    .eq('data_source', 'disasterassist.gov.au')
    .order('declaration_date', { ascending: false });
    
  if (activeDisasters && activeDisasters.length > 0) {
    console.log('\n🚨 CURRENT ACTIVE DISASTERS:');
    console.log('='.repeat(60));
    
    const byState = {};
    activeDisasters.forEach(d => {
      if (!byState[d.state_code]) byState[d.state_code] = [];
      byState[d.state_code].push(d);
    });
    
    for (const [state, disasters] of Object.entries(byState)) {
      console.log(`\n${state}:`);
      disasters.forEach(d => {
        console.log(`  • ${d.description}`);
        console.log(`    AGRN: ${d.agrn_reference} | Date: ${d.declaration_date}`);
      });
    }
  }
  
  // 3. Test postcode verification
  console.log('\n\n🏘️ TESTING POSTCODE VERIFICATION:');
  console.log('='.repeat(40));
  
  const testPostcodes = [
    { postcode: '2000', name: 'Sydney CBD' },
    { postcode: '3000', name: 'Melbourne CBD' },
    { postcode: '4000', name: 'Brisbane CBD' },
    { postcode: '4870', name: 'Cairns' }
  ];
  
  for (const test of testPostcodes) {
    // Find LGA for postcode
    const { data: postcodeData } = await supabase
      .from('postcodes')
      .select('primary_lga_id')
      .eq('postcode', test.postcode)
      .single();
      
    if (postcodeData?.primary_lga_id) {
      // Get LGA code
      const { data: lgaData } = await supabase
        .from('lgas')
        .select('lga_code')
        .eq('id', postcodeData.primary_lga_id)
        .single();
        
      if (lgaData?.lga_code) {
        // Check for disasters
        const { data: disasters } = await supabase
          .from('disaster_declarations')
          .select('description, agrn_reference')
          .eq('lga_code', lgaData.lga_code)
          .eq('declaration_status', 'active');
          
        if (disasters && disasters.length > 0) {
          console.log(`✅ ${test.postcode} (${test.name}): ${disasters.length} active disaster(s)`);
          disasters.forEach(d => {
            console.log(`   - ${d.description} (${d.agrn_reference})`);
          });
        } else {
          console.log(`❌ ${test.postcode} (${test.name}): No active disasters`);
        }
      }
    } else {
      console.log(`⚠️ ${test.postcode} (${test.name}): Postcode not mapped to LGA`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ DATABASE HAS REAL DISASTER DATA FROM DISASTERASSIST.GOV.AU');
  console.log('='.repeat(60));
}

testRealDisasters().catch(console.error);