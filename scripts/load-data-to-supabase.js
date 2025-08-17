import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';

const supabaseUrl = 'https://sfbohkqmykagkdmggcxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y';

const supabase = createClient(supabaseUrl, supabaseKey);

const stateMapping = {
  'NSW': { id: 1, name: 'New South Wales' },
  'VIC': { id: 2, name: 'Victoria' },
  'QLD': { id: 3, name: 'Queensland' },
  'SA': { id: 4, name: 'South Australia' },
  'WA': { id: 5, name: 'Western Australia' },
  'TAS': { id: 6, name: 'Tasmania' },
  'NT': { id: 7, name: 'Northern Territory' },
  'ACT': { id: 8, name: 'Australian Capital Territory' }
};

async function loadData() {
  console.log('Loading Australian geographic data...');
  
  // Load states
  console.log('Loading states...');
  for (const [code, data] of Object.entries(stateMapping)) {
    const { error } = await supabase
      .from('states_territories')
      .upsert({ 
        id: data.id, 
        name: data.name, 
        code: code 
      }, { 
        onConflict: 'id' 
      });
    
    if (error) console.error(`Error loading state ${code}:`, error);
  }
  
  // Load postcodes and LGAs from CSV
  const postcodes = [];
  const lgas = new Map();
  
  await new Promise((resolve) => {
    fs.createReadStream('australian_postcodes.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Collect unique LGAs
        if (row.lgacode && row.lgaregion && row.state) {
          if (!lgas.has(row.lgacode)) {
            lgas.set(row.lgacode, {
              lga_code: row.lgacode,
              name: row.lgaregion,
              state_territory_id: stateMapping[row.state]?.id
            });
          }
        }
        
        // Collect postcodes
        if (row.postcode && row.state) {
          postcodes.push({
            postcode: row.postcode.padStart(4, '0'),
            suburb: row.locality || row.postcode,
            state_territory_id: stateMapping[row.state]?.id,
            latitude: parseFloat(row.lat) || null,
            longitude: parseFloat(row.long) || null
          });
        }
      })
      .on('end', resolve);
  });
  
  // Load LGAs in batches
  console.log(`Loading ${lgas.size} LGAs...`);
  const lgaArray = Array.from(lgas.values()).filter(l => l.state_territory_id);
  
  for (let i = 0; i < lgaArray.length; i += 100) {
    const batch = lgaArray.slice(i, i + 100);
    const { error } = await supabase
      .from('lgas')
      .upsert(batch, { onConflict: 'lga_code' });
    
    if (error) console.error(`Error loading LGA batch ${i/100}:`, error);
    else console.log(`Loaded LGA batch ${i/100 + 1}/${Math.ceil(lgaArray.length/100)}`);
  }
  
  // Get unique postcodes
  const uniquePostcodes = new Map();
  postcodes.forEach(p => {
    if (!uniquePostcodes.has(p.postcode)) {
      uniquePostcodes.set(p.postcode, p);
    }
  });
  
  // Load postcodes in batches
  console.log(`Loading ${uniquePostcodes.size} postcodes...`);
  const postcodeArray = Array.from(uniquePostcodes.values());
  
  for (let i = 0; i < postcodeArray.length; i += 100) {
    const batch = postcodeArray.slice(i, i + 100);
    const { error } = await supabase
      .from('postcodes')
      .upsert(batch, { onConflict: 'postcode' });
    
    if (error) console.error(`Error loading postcode batch ${i/100}:`, error);
    else console.log(`Loaded postcode batch ${i/100 + 1}/${Math.ceil(postcodeArray.length/100)}`);
  }
  
  console.log('Data loading complete!');
  
  // Verify counts
  const { count: lgaCount } = await supabase
    .from('lgas')
    .select('*', { count: 'exact', head: true });
  
  const { count: postcodeCount } = await supabase
    .from('postcodes')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Final counts: ${lgaCount} LGAs, ${postcodeCount} postcodes`);
}

loadData().catch(console.error);