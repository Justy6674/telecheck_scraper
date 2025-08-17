import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';

const supabaseUrl = 'https://sfbohkqmykagkdmggcxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPostcodeLGAMapping() {
  console.log('Fixing postcode to LGA mappings...');
  
  // First, create a mapping of LGA codes to IDs
  const { data: lgas } = await supabase
    .from('lgas')
    .select('id, lga_code, name');
  
  const lgaMap = new Map();
  lgas.forEach(lga => {
    if (lga.lga_code) {
      lgaMap.set(lga.lga_code, lga.id);
    }
  });
  
  console.log(`Found ${lgaMap.size} LGAs in database`);
  
  // Read the CSV to get postcode-LGA mappings
  const postcodeLGAMappings = new Map();
  
  await new Promise((resolve) => {
    fs.createReadStream('australian_postcodes.csv')
      .pipe(csv())
      .on('data', (row) => {
        if (row.postcode && row.lgacode) {
          const postcode = row.postcode.padStart(4, '0');
          const lgaCode = row.lgacode;
          
          // Store the first LGA for each postcode
          if (!postcodeLGAMappings.has(postcode) && lgaMap.has(lgaCode)) {
            postcodeLGAMappings.set(postcode, lgaMap.get(lgaCode));
          }
        }
      })
      .on('end', resolve);
  });
  
  console.log(`Found ${postcodeLGAMappings.size} postcode-LGA mappings`);
  
  // Update postcodes with their LGA IDs
  let updated = 0;
  const updates = [];
  
  for (const [postcode, lgaId] of postcodeLGAMappings) {
    updates.push({
      postcode: postcode,
      primary_lga_id: lgaId
    });
    
    // Process in batches of 100
    if (updates.length >= 100) {
      const { error } = await supabase
        .from('postcodes')
        .upsert(updates, { onConflict: 'postcode' });
      
      if (error) {
        console.error('Error updating batch:', error);
      } else {
        updated += updates.length;
        console.log(`Updated ${updated} postcodes...`);
      }
      
      updates.length = 0;
    }
  }
  
  // Process remaining updates
  if (updates.length > 0) {
    const { error } = await supabase
      .from('postcodes')
      .upsert(updates, { onConflict: 'postcode' });
    
    if (error) {
      console.error('Error updating final batch:', error);
    } else {
      updated += updates.length;
    }
  }
  
  console.log(`Fixed ${updated} postcode-LGA mappings`);
  
  // Verify the fix
  const { data: verifyData } = await supabase
    .from('postcodes')
    .select('*', { count: 'exact', head: true })
    .not('primary_lga_id', 'is', null);
  
  console.log(`Postcodes with LGA mappings: ${verifyData.count}`);
}

fixPostcodeLGAMapping().catch(console.error);