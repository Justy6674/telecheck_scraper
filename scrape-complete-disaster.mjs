#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🎯 COMPLETE DISASTER DATA EXTRACTION - Testing on a DIFFERENT disaster\n');

// Helper to check if text is likely an LGA name
function isLikelyLGA(text) {
  if (!text || text.length < 3 || text.length > 50) return false;
  
  // Exclude navigation and non-LGA items
  const excludeList = [
    'Home', 'Contact', 'About', 'Help', 'Search', 'Menu',
    'Services Australia', 'Skip to', 'PORTFOLIO', 'BORDER',
    'Find a disaster', 'Getting help', 'How to help',
    'Disaster arrangements', 'Key contacts',
    'Web privacy', 'Accessibility', 'Freedom of information',
    'Copyright', 'Privacy', 'Lost or damaged',
    'National Emergency', 'Disaster Recovery Funding',
    'Bushfire', 'Storm', 'Flood', 'Cyclone', 'Drought'
  ];
  
  if (excludeList.some(ex => text.toLowerCase().includes(ex.toLowerCase()))) return false;
  
  // Must start with capital letter and contain at least one lowercase
  if (!/^[A-Z][a-z]/.test(text)) return false;
  
  // Should not contain URLs or special characters
  if (text.includes('http') || text.includes('www') || text.includes('@')) return false;
  
  return true;
}

async function scrapeCompleteDisaster() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    console.log('📄 Loading disasters list...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    
    // Find a DIFFERENT disaster (not Cyclone Alfred, preferably NSW or VIC)
    const disaster = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      
      // Look for NSW or VIC disasters that aren't Cyclone Alfred
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        const state = cells[2]?.textContent?.trim();
        const eventName = cells[4]?.textContent?.trim();
        const agrn = cells[5]?.textContent?.trim();
        
        // Pick first NSW or VIC disaster, or any non-Alfred disaster
        if ((state === 'NSW' || state === 'VIC' || state === 'New South Wales' || state === 'Victoria') ||
            (!eventName?.includes('Alfred') && agrn)) {
          return {
            startDate: cells[0]?.textContent?.trim(),
            endDate: cells[1]?.textContent?.trim(),
            state: state,
            type: cells[3]?.textContent?.trim(),
            eventName: eventName,
            agrn: agrn,
            detailLink: cells[5]?.querySelector('a')?.href || cells[4]?.querySelector('a')?.href
          };
        }
      }
      
      // Fallback to any disaster with a link
      const row = rows[10]; // Pick 10th row
      const cells = row.querySelectorAll('td');
      return {
        startDate: cells[0]?.textContent?.trim(),
        endDate: cells[1]?.textContent?.trim(),
        state: cells[2]?.textContent?.trim(),
        type: cells[3]?.textContent?.trim(),
        eventName: cells[4]?.textContent?.trim(),
        agrn: cells[5]?.textContent?.trim(),
        detailLink: cells[5]?.querySelector('a')?.href || cells[4]?.querySelector('a')?.href
      };
    });
    
    console.log('=' .repeat(80));
    console.log('📋 SELECTED DISASTER:');
    console.log('=' .repeat(80));
    console.log('Event:', disaster.eventName);
    console.log('AGRN:', disaster.agrn);
    console.log('State:', disaster.state);
    console.log('Type:', disaster.type);
    console.log('Dates:', disaster.startDate, '-', disaster.endDate);
    console.log('URL:', disaster.detailLink);
    
    if (!disaster.detailLink) {
      throw new Error('No detail link found');
    }

    console.log('\n🔗 Opening disaster detail page...\n');
    await page.goto(disaster.detailLink, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // EXTRACT COMPLETE DATA
    const completeData = await page.evaluate(() => {
      const data = {
        // Basic info
        url: window.location.href,
        title: document.querySelector('h1')?.innerText?.trim(),
        
        // Quick Info (metadata)
        quickInfo: {},
        
        // Extract ALL lists (where LGAs are stored)
        allLists: [],
        
        // Extract all paragraphs (assistance details)
        allParagraphs: [],
        
        // Full page text
        fullText: document.body.innerText
      };
      
      // Extract Quick Info section (dt/dd pairs)
      const dtElements = document.querySelectorAll('dt');
      const ddElements = document.querySelectorAll('dd');
      for (let i = 0; i < dtElements.length; i++) {
        const key = dtElements[i]?.innerText?.trim();
        const value = ddElements[i]?.innerText?.trim();
        if (key && value) {
          data.quickInfo[key] = value;
        }
      }
      
      // Extract ALL lists
      const lists = document.querySelectorAll('ul');
      lists.forEach((ul, index) => {
        const items = Array.from(ul.querySelectorAll('li')).map(li => li.innerText.trim());
        if (items.length > 0) {
          data.allLists.push({
            index,
            items,
            // Flag if this looks like an LGA list
            looksLikeLGAs: items.length > 5 && items.every(item => 
              item.length < 50 && !item.includes('http') && /^[A-Z]/.test(item)
            )
          });
        }
      });
      
      // Extract all paragraphs
      const paragraphs = document.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.innerText?.trim();
        if (text && text.length > 20) {
          data.allParagraphs.push(text);
        }
      });
      
      // Extract any links
      const links = document.querySelectorAll('a');
      data.relatedLinks = [];
      links.forEach(a => {
        const text = a.innerText?.trim();
        const href = a.href;
        if (text && href && !href.includes('javascript') && 
            (text.includes('Authority') || text.includes('Services') || text.includes('Department'))) {
          data.relatedLinks.push({ text, url: href });
        }
      });
      
      return data;
    });
    
    // PROCESS EXTRACTED DATA
    console.log('=' .repeat(80));
    console.log('📊 PROCESSING EXTRACTED DATA:');
    console.log('=' .repeat(80));
    
    // Extract unique LGAs from lists
    const allLGAs = new Set();
    const lgasByProgram = {};
    
    completeData.allLists.forEach((list, idx) => {
      if (list.looksLikeLGAs || list.items.some(item => isLikelyLGA(item))) {
        console.log(`\n📍 List ${idx} appears to contain ${list.items.length} LGAs`);
        
        list.items.forEach(item => {
          const cleaned = item.replace(/\(.*?\)/g, '').trim();
          if (isLikelyLGA(cleaned)) {
            allLGAs.add(cleaned);
          }
        });
        
        // Try to identify which program this is for
        if (idx > 0 && completeData.allParagraphs[idx - 1]) {
          const prevText = completeData.allParagraphs[idx - 1];
          if (prevText.includes('AGDRP')) lgasByProgram.agdrp = list.items;
          else if (prevText.includes('DRA')) lgasByProgram.dra = list.items;
          else if (prevText.includes('primary producer')) lgasByProgram.primary = list.items;
          else if (prevText.includes('counter disaster')) lgasByProgram.counter = list.items;
        }
      }
    });
    
    const uniqueLGAs = Array.from(allLGAs);
    console.log(`\n✅ Found ${uniqueLGAs.length} unique LGAs:`, uniqueLGAs);
    
    // Extract assistance details from paragraphs
    const assistanceDetails = {};
    completeData.allParagraphs.forEach(para => {
      if (para.includes('$1000') && para.includes('adult')) {
        assistanceDetails.agdrp_payment = { adult: 1000, child: 400 };
      }
      if (para.includes('September 2025')) {
        assistanceDetails.claim_deadline = '2025-09-18';
      }
      if (para.includes('180 22 66')) {
        assistanceDetails.hotline = '180 22 66';
      }
      if (para.includes('$75,000') && para.includes('primary')) {
        assistanceDetails.primary_producer_grant = 75000;
      }
      if (para.includes('$25,000') && para.includes('business')) {
        assistanceDetails.small_business_grant = 25000;
      }
    });
    
    console.log('\n💰 Assistance Details:', assistanceDetails);
    
    // Lookup LGA codes
    console.log('\n🔍 Looking up LGA codes...');
    const lgaCodes = [];
    for (const lgaName of uniqueLGAs) {
      const { data: lgaData } = await supabase
        .from('lga_registry')
        .select('lga_code, lga_name')
        .or(`lga_name.ilike.%${lgaName}%,lga_name.ilike.%${lgaName.replace(' ', '%')}%`)
        .eq('state_code', mapStateCode(disaster.state))
        .limit(1)
        .single();
      
      if (lgaData) {
        lgaCodes.push(lgaData.lga_code);
        console.log(`   ✅ ${lgaName} → ${lgaData.lga_code}`);
      } else {
        console.log(`   ⚠️ No code found for: ${lgaName}`);
      }
    }
    
    // Build complete disaster record
    const disasterRecord = {
      agrn_reference: `AGRN-${disaster.agrn?.replace(',', '')}`,
      event_name: disaster.eventName || completeData.title,
      disaster_type: mapDisasterType(disaster.type),
      declaration_date: parseDate(disaster.startDate),
      expiry_date: disaster.endDate ? parseDate(disaster.endDate) : null,
      declaration_status: 'active',
      severity_level: 3,
      state_code: mapStateCode(disaster.state),
      lga_code: lgaCodes[0] || getStateCapitalLGA(disaster.state),
      
      // COMPREHENSIVE affected_areas field
      affected_areas: {
        all_lgas: uniqueLGAs,
        all_lga_codes: lgaCodes,
        lga_count: uniqueLGAs.length,
        
        assistance_programs: {
          ...lgasByProgram,
          details: assistanceDetails
        },
        
        quick_info: completeData.quickInfo,
        related_links: completeData.relatedLinks,
        
        extracted_at: new Date().toISOString()
      },
      
      description: completeData.allParagraphs.slice(0, 5).join('\n\n'),
      declaration_authority: 'Australian Government',
      source_url: completeData.url,
      verification_url: completeData.url,
      data_source: 'disasterassist.gov.au',
      source_system: 'Complete Disaster Scraper',
      last_sync_timestamp: new Date().toISOString()
    };
    
    console.log('\n' + '=' .repeat(80));
    console.log('💾 SAVING TO DATABASE:');
    console.log('=' .repeat(80));
    console.log('AGRN:', disasterRecord.agrn_reference);
    console.log('Event:', disasterRecord.event_name);
    console.log('State:', disasterRecord.state_code);
    console.log('LGAs:', uniqueLGAs.length);
    console.log('Primary LGA Code:', disasterRecord.lga_code);
    
    const { error } = await supabase
      .from('disaster_declarations')
      .upsert(disasterRecord, {
        onConflict: 'agrn_reference',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('\n❌ Database error:', error.message);
    } else {
      console.log('\n✅ SUCCESS! Complete disaster data saved');
      
      // Verify
      const { data: saved } = await supabase
        .from('disaster_declarations')
        .select('*')
        .eq('agrn_reference', disasterRecord.agrn_reference)
        .single();
      
      if (saved) {
        console.log('\n🔍 Verification:');
        console.log('   Saved event:', saved.event_name);
        console.log('   LGA count in DB:', saved.affected_areas?.all_lgas?.length || 0);
        console.log('   Has assistance details:', !!saved.affected_areas?.assistance_programs);
        console.log('   Has related links:', !!saved.affected_areas?.related_links);
      }
    }
    
    // Screenshot
    await page.screenshot({ path: 'complete-disaster-extraction.png', fullPage: true });
    console.log('\n📸 Screenshot saved: complete-disaster-extraction.png');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n✅ Test complete. Browser closing in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

// Helper functions
function mapDisasterType(type) {
  const typeStr = type?.toLowerCase() || '';
  if (typeStr.includes('flood')) return 'flood';
  if (typeStr.includes('fire') || typeStr.includes('bushfire')) return 'bushfire';
  if (typeStr.includes('cyclone')) return 'cyclone';
  if (typeStr.includes('storm')) return 'severe_storm';
  if (typeStr.includes('earthquake')) return 'earthquake';
  if (typeStr.includes('drought')) return 'drought';
  return 'other';
}

function mapStateCode(state) {
  const stateMap = {
    'New South Wales': 'NSW', 'NSW': 'NSW',
    'Victoria': 'VIC', 'VIC': 'VIC',
    'Queensland': 'QLD', 'QLD': 'QLD',
    'South Australia': 'SA', 'SA': 'SA',
    'Western Australia': 'WA', 'WA': 'WA',
    'Tasmania': 'TAS', 'TAS': 'TAS',
    'Northern Territory': 'NT', 'NT': 'NT',
    'Australian Capital Territory': 'ACT', 'ACT': 'ACT'
  };
  return stateMap[state] || 'NSW';
}

function getStateCapitalLGA(state) {
  const capitals = {
    'NSW': '17200', // Sydney
    'VIC': '24600', // Melbourne  
    'QLD': '31000', // Brisbane
    'SA': '40070',  // Adelaide
    'WA': '57080',  // Perth
    'TAS': '62810', // Hobart
    'NT': '71000',  // Darwin
    'ACT': '89000'  // Unincorporated ACT
  };
  const stateCode = mapStateCode(state);
  return capitals[stateCode] || '17200';
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    // Handle various date formats
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    // Handle "Mar 2025" format
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMatch = dateStr.match(/(\w{3})\s+(\d{4})/);
    if (monthMatch) {
      const monthIdx = months.indexOf(monthMatch[1]);
      if (monthIdx >= 0) {
        return `${monthMatch[2]}-${(monthIdx + 1).toString().padStart(2, '0')}-01`;
      }
    }
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Run the complete extraction
scrapeCompleteDisaster().catch(console.error);