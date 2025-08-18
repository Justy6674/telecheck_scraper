#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Direct Supabase connection
const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🎯 TEST ONE COMPLETE DISASTER - Extract ALL data and save to Supabase\n');

async function testOneCompleteDisaster() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    console.log('📄 Loading DisasterAssist...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    
    // Get a random disaster from the table
    const disaster = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      // Pick a random one from first 20
      const randomIndex = Math.floor(Math.random() * Math.min(rows.length, 20));
      const row = rows[randomIndex];
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
    console.log('Event Name:', disaster.eventName);
    console.log('AGRN:', disaster.agrn);
    console.log('State:', disaster.state);
    console.log('Type:', disaster.type);
    console.log('Start Date:', disaster.startDate);
    console.log('End Date:', disaster.endDate);
    console.log('Detail URL:', disaster.detailLink);
    
    if (!disaster.detailLink) {
      throw new Error('No detail link found');
    }

    console.log('\n🔗 Clicking into detail page...\n');
    await page.goto(disaster.detailLink, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Extract COMPLETE data from detail page
    const detailData = await page.evaluate(() => {
      const data = {
        title: '',
        quickInfo: {},
        affectedLGAs: [],
        assistanceTypes: [],
        relatedLinks: [],
        fullDescription: '',
        detailPageUrl: window.location.href
      };
      
      // Get page title
      data.title = document.querySelector('h1')?.textContent?.trim() || '';
      
      // Extract Quick Info section
      const dtElements = document.querySelectorAll('dt');
      const ddElements = document.querySelectorAll('dd');
      for (let i = 0; i < dtElements.length; i++) {
        const key = dtElements[i]?.textContent?.trim();
        const value = ddElements[i]?.textContent?.trim();
        if (key && value) {
          data.quickInfo[key] = value;
        }
      }
      
      // CRITICAL: Find LGAs after the specific marker text
      const bodyText = document.body.innerText;
      const lgaMarker = 'The above assistance may be available in the following local government area';
      const lgaIndex = bodyText.indexOf(lgaMarker);
      
      if (lgaIndex > -1) {
        // Get text after the marker (up to next section or 500 chars)
        const afterMarker = bodyText.substring(lgaIndex + lgaMarker.length);
        const nextSectionIndex = afterMarker.search(/Related Links|Quick Info|Disaster Recovery/i);
        const lgaSection = nextSectionIndex > -1 
          ? afterMarker.substring(0, nextSectionIndex)
          : afterMarker.substring(0, 500);
        
        // Split by newlines and clean
        const lines = lgaSection.split(/[\n\r]+/);
        
        for (const line of lines) {
          const cleaned = line.trim();
          // Skip empty lines, parentheses content, and section headers
          if (cleaned && 
              cleaned.length > 2 && 
              cleaned.length < 100 &&
              !cleaned.includes('(s)') &&
              !cleaned.includes(':') &&
              !cleaned.includes('●')) {
            // This is likely an LGA name
            data.affectedLGAs.push(cleaned);
          }
        }
      }
      
      // Get the main content/description
      const mainContent = document.querySelector('main, .content, article');
      if (mainContent) {
        // Get all paragraph text
        const paragraphs = mainContent.querySelectorAll('p');
        const descParts = [];
        paragraphs.forEach(p => {
          const text = p.textContent?.trim();
          if (text && text.length > 20) {
            descParts.push(text);
          }
        });
        data.fullDescription = descParts.join('\n\n');
      }
      
      // Extract assistance types (bullet points)
      const bullets = document.querySelectorAll('li');
      bullets.forEach(bullet => {
        const text = bullet.textContent?.trim();
        if (text && (text.includes('assistance') || text.includes('counter disaster') || text.includes('reconstruction'))) {
          data.assistanceTypes.push(text);
        }
      });
      
      // Extract related links with URLs
      const linkSection = document.querySelector('.related-links, aside');
      const links = linkSection ? linkSection.querySelectorAll('a') : document.querySelectorAll('a');
      links.forEach(link => {
        const text = link.textContent?.trim();
        const href = link.href;
        if (text && href && 
            !href.includes('javascript') && 
            !href.includes('#') &&
            (text.includes('Authority') || text.includes('Department') || text.includes('passport'))) {
          data.relatedLinks.push({ 
            text, 
            url: href 
          });
        }
      });
      
      return data;
    });
    
    console.log('=' .repeat(80));
    console.log('📊 EXTRACTED COMPLETE DATA:');
    console.log('=' .repeat(80));
    
    console.log('\n📌 Title:', detailData.title);
    console.log('🔗 Detail Page URL:', detailData.detailPageUrl);
    
    console.log('\n📋 Quick Info:');
    Object.entries(detailData.quickInfo).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n🏛️  AFFECTED LGAs (' + detailData.affectedLGAs.length + ' found):');
    if (detailData.affectedLGAs.length > 0) {
      detailData.affectedLGAs.forEach(lga => {
        console.log(`   • ${lga}`);
      });
    } else {
      console.log('   ⚠️ No LGAs found - may need manual extraction');
    }
    
    console.log('\n💰 Assistance Types:');
    detailData.assistanceTypes.forEach(type => {
      console.log(`   • ${type}`);
    });
    
    console.log('\n🔗 Related Links:');
    detailData.relatedLinks.forEach(link => {
      console.log(`   • ${link.text}: ${link.url}`);
    });
    
    console.log('\n📝 Description (first 500 chars):');
    console.log(detailData.fullDescription.substring(0, 500));
    
    // Now map LGA names to codes and save to database
    console.log('\n' + '=' .repeat(80));
    console.log('💾 SAVING TO DATABASE...');
    console.log('=' .repeat(80));
    
    // First, lookup LGA codes for the affected LGAs
    const lgaCodes = [];
    if (detailData.affectedLGAs.length > 0) {
      for (const lgaName of detailData.affectedLGAs) {
        const { data: lgaData } = await supabase
          .from('lga_registry')
          .select('lga_code, lga_name')
          .or(`lga_name.ilike.%${lgaName}%,lga_name.ilike.%${lgaName.replace(' ', '%')}%`)
          .limit(1)
          .single();
        
        if (lgaData) {
          lgaCodes.push(lgaData.lga_code);
          console.log(`   ✅ Mapped "${lgaName}" to LGA code: ${lgaData.lga_code}`);
        } else {
          console.log(`   ⚠️ Could not find LGA code for: ${lgaName}`);
        }
      }
    }
    
    // Use first LGA code or fallback to state capital
    const primaryLgaCode = lgaCodes[0] || getStateCapitalLGA(disaster.state);
    
    // Prepare the complete disaster record
    const disasterRecord = {
      agrn_reference: `AGRN-${disaster.agrn}`,
      event_name: disaster.eventName || detailData.title,
      disaster_type: mapDisasterType(disaster.type),
      declaration_date: parseDate(disaster.startDate),
      expiry_date: disaster.endDate ? parseDate(disaster.endDate) : null,
      declaration_status: disaster.endDate && new Date(disaster.endDate) < new Date() ? 'expired' : 'active',
      severity_level: 3,
      state_code: mapStateCode(disaster.state),
      lga_code: primaryLgaCode,
      affected_areas: {
        lgas: detailData.affectedLGAs,
        lga_codes: lgaCodes,
        assistance_types: detailData.assistanceTypes,
        related_links: detailData.relatedLinks
      },
      description: detailData.fullDescription || detailData.title,
      declaration_authority: 'Australian Government',
      source_url: detailData.detailPageUrl,
      verification_url: detailData.detailPageUrl,
      data_source: 'disasterassist.gov.au',
      source_system: 'Complete Test Scraper',
      last_sync_timestamp: new Date().toISOString()
    };
    
    console.log('\n📤 Saving disaster record...');
    console.log('   AGRN:', disasterRecord.agrn_reference);
    console.log('   Event:', disasterRecord.event_name);
    console.log('   Primary LGA:', disasterRecord.lga_code);
    console.log('   Affected LGAs:', lgaCodes.length);
    console.log('   Source URL:', disasterRecord.source_url);
    
    const { error } = await supabase
      .from('disaster_declarations')
      .upsert(disasterRecord, {
        onConflict: 'agrn_reference',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('\n❌ Database error:', error.message);
      console.error('Details:', error);
    } else {
      console.log('\n✅ SUCCESS! Disaster saved to database with complete data');
      
      // Verify it was saved
      const { data: saved } = await supabase
        .from('disaster_declarations')
        .select('*')
        .eq('agrn_reference', disasterRecord.agrn_reference)
        .single();
      
      if (saved) {
        console.log('\n🔍 Verification - Record in database:');
        console.log('   ID:', saved.id);
        console.log('   Event Name:', saved.event_name);
        console.log('   LGA Code:', saved.lga_code);
        console.log('   Affected Areas:', JSON.stringify(saved.affected_areas, null, 2));
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'complete-disaster-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: complete-disaster-test.png');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n✅ Test complete. Browser will close in 10 seconds...');
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
    // Handle DD/MM/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Run the test
testOneCompleteDisaster().catch(console.error);