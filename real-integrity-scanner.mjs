#!/usr/bin/env node

/**
 * REAL DATA INTEGRITY SCANNER
 * Actually checks:
 * 1. Current Supabase database data
 * 2. Live DisasterAssist website
 * 3. Current codebase for bugs
 * 4. Supabase functions and triggers
 * 5. Real postcode lookups
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🔍 REAL INTEGRITY SCANNER - CHECKING ACTUAL DATA\n');

class RealIntegrityScanner {
  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      database: {},
      liveWebsite: {},
      codebase: {},
      supabaseFunctions: {},
      discrepancies: []
    };
  }

  async scanEverything() {
    console.log('Starting comprehensive scan of ALL systems...\n');
    
    // 1. Scan actual Supabase database
    await this.scanDatabase();
    
    // 2. Scan live DisasterAssist website
    await this.scanLiveWebsite();
    
    // 3. Scan current codebase
    await this.scanCodebase();
    
    // 4. Scan Supabase functions
    await this.scanSupabaseFunctions();
    
    // 5. Test real postcode lookups
    await this.testPostcodeLookups();
    
    // 6. Compare and report
    await this.compareAndReport();
  }

  /**
   * 1. SCAN ACTUAL DATABASE
   */
  async scanDatabase() {
    console.log('📊 SCANNING SUPABASE DATABASE...\n');
    
    // Get actual counts
    const { data: totalDisasters } = await supabase
      .from('disaster_declarations')
      .select('*', { count: 'exact', head: true });
    
    const { data: activeDisasters } = await supabase
      .from('disaster_declarations')
      .select('*', { count: 'exact', head: true })
      .is('expiry_date', null);
    
    const { data: statusCounts } = await supabase
      .from('disaster_declarations')
      .select('declaration_status')
      .then(result => {
        const counts = {};
        result.data?.forEach(d => {
          counts[d.declaration_status] = (counts[d.declaration_status] || 0) + 1;
        });
        return { data: counts };
      });
    
    // Get state breakdown
    const { data: stateBreakdown } = await supabase.rpc('get_state_disaster_counts');
    
    // Check specific QLD count
    const { data: qldActive } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, event_name, declaration_status, expiry_date')
      .eq('state_code', 'QLD')
      .is('expiry_date', null);
    
    const { data: qldWithOnwards } = await supabase
      .from('disaster_declarations')
      .select('*')
      .eq('state_code', 'QLD')
      .or('event_name.ilike.%onwards%,event_name.ilike.%commencing%');
    
    // Check postcode mappings
    const { data: postcodeMappings } = await supabase
      .from('postcode_lga_mapping')
      .select('*', { count: 'exact', head: true });
    
    const { data: uniqueLGAs } = await supabase.rpc('count_unique_lgas_in_mappings');
    
    // Check population data
    const { data: lgasWithoutPop } = await supabase
      .from('lgas')
      .select('*', { count: 'exact', head: true })
      .or('population.is.null,population.eq.0');
    
    this.report.database = {
      total_disasters: totalDisasters || 0,
      active_by_null_expiry: activeDisasters || 0,
      status_counts: statusCounts,
      qld_specific: {
        active_by_null_date: qldActive?.length || 0,
        with_onwards_keywords: qldWithOnwards?.length || 0,
        sample_onwards_but_expired: qldWithOnwards?.filter(d => 
          d.declaration_status === 'expired'
        ).slice(0, 5)
      },
      postcode_issues: {
        total_mappings: postcodeMappings || 0,
        unique_lgas: uniqueLGAs || 'unknown',
        all_to_brisbane: 'checking...'
      },
      population_issues: {
        lgas_without_population: lgasWithoutPop || 0
      }
    };
    
    console.log('   Database scan results:');
    console.log(`   - Total disasters: ${this.report.database.total_disasters}`);
    console.log(`   - Active (no end date): ${this.report.database.active_by_null_expiry}`);
    console.log(`   - QLD with 'onwards': ${this.report.database.qld_specific.with_onwards_keywords}`);
    console.log(`   - QLD marked active: ${this.report.database.qld_specific.active_by_null_date}`);
    console.log(`   - Postcode mappings: ${this.report.database.postcode_issues.total_mappings}`);
    console.log(`   - LGAs without population: ${this.report.database.population_issues.lgas_without_population}\n`);
  }

  /**
   * 2. SCAN LIVE WEBSITE WITH PUPPETEER
   */
  async scanLiveWebsite() {
    console.log('🌐 SCANNING LIVE DISASTERASSIST WEBSITE...\n');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      console.log('   Opening DisasterAssist.gov.au...');
      await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      // Count disasters on live site
      const liveData = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        const stateCount = {};
        const activeCount = {};
        let totalActive = 0;
        let totalRows = rows.length;
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const endDate = cells[1]?.textContent?.trim();
            const state = cells[2]?.textContent?.trim();
            const hasEndDate = endDate && endDate !== '-' && endDate !== '';
            
            if (state) {
              stateCount[state] = (stateCount[state] || 0) + 1;
              
              if (!hasEndDate) {
                activeCount[state] = (activeCount[state] || 0) + 1;
                totalActive++;
              }
            }
          }
        });
        
        // Try to find total count on page
        const totalText = document.body.innerText.match(/(\d+)\s+disasters?/i);
        const pageTotal = totalText ? parseInt(totalText[1]) : null;
        
        return {
          total_visible_rows: totalRows,
          total_on_page: pageTotal,
          states_with_disasters: Object.keys(stateCount).length,
          by_state: stateCount,
          active_by_state: activeCount,
          total_active: totalActive
        };
      });
      
      // Check specifically for QLD
      const qldData = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        let qldActive = 0;
        let qldTotal = 0;
        const qldSamples = [];
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const state = cells[2]?.textContent?.trim();
            if (state === 'QLD' || state === 'Queensland') {
              qldTotal++;
              const endDate = cells[1]?.textContent?.trim();
              if (!endDate || endDate === '-') {
                qldActive++;
                if (qldSamples.length < 5) {
                  qldSamples.push({
                    name: cells[4]?.textContent?.trim(),
                    dates: `${cells[0]?.textContent?.trim()} - ${endDate}`
                  });
                }
              }
            }
          }
        });
        
        return { qldTotal, qldActive, samples: qldSamples };
      });
      
      this.report.liveWebsite = {
        ...liveData,
        qld_specific: qldData,
        scan_time: new Date().toISOString()
      };
      
      console.log('   Live website results:');
      console.log(`   - Total disasters visible: ${liveData.total_visible_rows}`);
      console.log(`   - Total active (no end date): ${liveData.total_active}`);
      console.log(`   - QLD total: ${qldData.qldTotal}`);
      console.log(`   - QLD active: ${qldData.qldActive}\n`);
      
    } catch (error) {
      console.error('   Error scanning website:', error.message);
      this.report.liveWebsite.error = error.message;
    } finally {
      await browser.close();
    }
  }

  /**
   * 3. SCAN CODEBASE FOR ISSUES
   */
  async scanCodebase() {
    console.log('📁 SCANNING CODEBASE...\n');
    
    const issues = [];
    
    // Check scraper files
    const scraperFiles = [
      'scrape-all-disasters-puppeteer.mjs',
      'scrape-active-disasters-only.mjs',
      'scrape-all-disasters-fixed.mjs'
    ];
    
    for (const file of scraperFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for problematic patterns
        if (content.includes("disaster.endDate ? 'expired' : 'active'")) {
          issues.push({
            file: file,
            issue: 'Status logic ignores keywords',
            line: content.split('\n').findIndex(l => l.includes("'expired' : 'active'")) + 1
          });
        }
        
        if (content.includes('lga_id: 1')) {
          issues.push({
            file: file,
            issue: 'Hardcoded Brisbane LGA ID',
            line: content.split('\n').findIndex(l => l.includes('lga_id: 1')) + 1
          });
        }
      }
    }
    
    // Check React components
    const componentPath = path.join(process.cwd(), 'src/components/StatePopulationTiles.tsx');
    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf-8');
      
      if (content.includes(".eq('declaration_status', 'active')")) {
        issues.push({
          file: 'StatePopulationTiles.tsx',
          issue: 'Frontend queries declaration_status=active',
          note: 'Many disasters incorrectly marked expired'
        });
      }
    }
    
    this.report.codebase = {
      files_scanned: scraperFiles.length + 1,
      issues_found: issues,
      critical_issues: issues.filter(i => i.issue.includes('ignores keywords'))
    };
    
    console.log('   Codebase scan results:');
    console.log(`   - Files scanned: ${this.report.codebase.files_scanned}`);
    console.log(`   - Issues found: ${issues.length}`);
    issues.forEach(i => {
      console.log(`     ⚠️ ${i.file}: ${i.issue}`);
    });
    console.log('');
  }

  /**
   * 4. SCAN SUPABASE FUNCTIONS
   */
  async scanSupabaseFunctions() {
    console.log('🔧 SCANNING SUPABASE FUNCTIONS & RPCS...\n');
    
    // List all RPC functions
    const { data: functions } = await supabase.rpc('get_function_list').catch(() => ({ data: null }));
    
    // Check if critical RPCs exist
    const criticalRPCs = [
      'get_state_disaster_counts',
      'check_duplicate_postcodes',
      'calculate_state_populations'
    ];
    
    const missingRPCs = [];
    for (const rpc of criticalRPCs) {
      try {
        await supabase.rpc(rpc);
      } catch (error) {
        if (error.message.includes('not exist')) {
          missingRPCs.push(rpc);
        }
      }
    }
    
    // Check database triggers
    const { data: triggers } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .catch(() => ({ data: [] }));
    
    this.report.supabaseFunctions = {
      rpcs_checked: criticalRPCs,
      missing_rpcs: missingRPCs,
      triggers_found: triggers?.length || 0
    };
    
    console.log('   Supabase functions scan:');
    console.log(`   - Critical RPCs checked: ${criticalRPCs.length}`);
    console.log(`   - Missing RPCs: ${missingRPCs.length}`);
    if (missingRPCs.length > 0) {
      missingRPCs.forEach(rpc => console.log(`     ❌ Missing: ${rpc}`));
    }
    console.log('');
  }

  /**
   * 5. TEST REAL POSTCODE LOOKUPS
   */
  async testPostcodeLookups() {
    console.log('📮 TESTING REAL POSTCODE LOOKUPS...\n');
    
    const testPostcodes = [
      { postcode: '2000', expected_city: 'Sydney' },
      { postcode: '3000', expected_city: 'Melbourne' },
      { postcode: '4000', expected_city: 'Brisbane' },
      { postcode: '5000', expected_city: 'Adelaide' },
      { postcode: '6000', expected_city: 'Perth' },
      { postcode: '7000', expected_city: 'Hobart' }
    ];
    
    const results = [];
    
    for (const test of testPostcodes) {
      const { data } = await supabase
        .from('postcode_lga_mapping')
        .select(`
          postcode,
          lgas!inner(name, lga_code)
        `)
        .eq('postcode', test.postcode)
        .single();
      
      const correct = data?.lgas?.name?.includes(test.expected_city);
      results.push({
        postcode: test.postcode,
        expected: test.expected_city,
        actual: data?.lgas?.name || 'NOT FOUND',
        correct: correct
      });
      
      console.log(`   ${test.postcode} → ${data?.lgas?.name || 'NOT FOUND'} ${correct ? '✅' : '❌'}`);
    }
    
    this.report.postcodeLookups = {
      tests_run: testPostcodes.length,
      passed: results.filter(r => r.correct).length,
      failed: results.filter(r => !r.correct).length,
      results: results
    };
    
    console.log(`   Results: ${this.report.postcodeLookups.passed}/${testPostcodes.length} correct\n`);
  }

  /**
   * 6. COMPARE AND REPORT
   */
  async compareAndReport() {
    console.log('=' .repeat(80));
    console.log('🔍 INTEGRITY SCAN COMPLETE - COMPARISON REPORT');
    console.log('=' .repeat(80));
    
    // MAJOR DISCREPANCY 1: QLD Disasters
    const dbQldActive = this.report.database.qld_specific.active_by_null_date;
    const liveQldActive = this.report.liveWebsite.qld_specific?.qldActive || 0;
    
    if (Math.abs(dbQldActive - liveQldActive) > 2) {
      this.report.discrepancies.push({
        severity: 'CRITICAL',
        issue: 'QLD active disaster count mismatch',
        database_shows: dbQldActive,
        live_site_shows: liveQldActive,
        difference: liveQldActive - dbQldActive,
        impact: 'Incorrect telehealth eligibility for Queensland'
      });
    }
    
    // MAJOR DISCREPANCY 2: Total Active
    const dbTotalActive = this.report.database.active_by_null_expiry;
    const liveTotalActive = this.report.liveWebsite.total_active || 0;
    
    if (Math.abs(dbTotalActive - liveTotalActive) > 10) {
      this.report.discrepancies.push({
        severity: 'CRITICAL',
        issue: 'Total active disasters mismatch',
        database_shows: dbTotalActive,
        live_site_shows: liveTotalActive,
        difference: liveTotalActive - dbTotalActive,
        impact: 'Widespread incorrect eligibility determinations'
      });
    }
    
    // MAJOR DISCREPANCY 3: Postcode Mappings
    if (this.report.postcodeLookups.failed > 0) {
      this.report.discrepancies.push({
        severity: 'HIGH',
        issue: 'Postcode mappings incorrect',
        failed_lookups: this.report.postcodeLookups.failed,
        examples: this.report.postcodeLookups.results.filter(r => !r.correct)
      });
    }
    
    console.log('\n📊 KEY METRICS:\n');
    console.log(`Database Total: ${this.report.database.total_disasters} disasters`);
    console.log(`Live Site Total: ${this.report.liveWebsite.total_visible_rows} disasters`);
    console.log(`Database Active: ${dbTotalActive}`);
    console.log(`Live Site Active: ${liveTotalActive}`);
    
    console.log('\n🚨 CRITICAL DISCREPANCIES:\n');
    this.report.discrepancies.forEach(d => {
      console.log(`${d.severity}: ${d.issue}`);
      console.log(`   Database: ${d.database_shows}`);
      console.log(`   Live Site: ${d.live_site_shows}`);
      console.log(`   Impact: ${d.impact}\n`);
    });
    
    console.log('🐛 CODE ISSUES FOUND:\n');
    this.report.codebase.issues_found.forEach(issue => {
      console.log(`   ${issue.file} line ${issue.line}: ${issue.issue}`);
    });
    
    console.log('\n📮 POSTCODE LOOKUP RESULTS:\n');
    this.report.postcodeLookups.results.forEach(r => {
      console.log(`   ${r.postcode}: Expected ${r.expected}, Got ${r.actual} ${r.correct ? '✅' : '❌'}`);
    });
    
    // Save full report
    fs.writeFileSync(
      'integrity-scan-report.json',
      JSON.stringify(this.report, null, 2)
    );
    
    console.log('\n💾 Full report saved to integrity-scan-report.json');
    console.log('=' .repeat(80));
    
    // Return exit code based on critical issues
    const criticalCount = this.report.discrepancies.filter(d => d.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      console.log(`\n❌ INTEGRITY CHECK FAILED - ${criticalCount} critical issues found`);
      process.exit(1);
    } else {
      console.log('\n✅ INTEGRITY CHECK PASSED');
    }
  }
}

// Create missing RPC functions
async function createMissingRPCs() {
  const rpcs = `
    -- Get state disaster counts
    CREATE OR REPLACE FUNCTION get_state_disaster_counts()
    RETURNS TABLE(state_code text, total bigint, active bigint) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        dd.state_code::text,
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE dd.expiry_date IS NULL)::bigint as active
      FROM disaster_declarations dd
      GROUP BY dd.state_code;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Count unique LGAs in mappings
    CREATE OR REPLACE FUNCTION count_unique_lgas_in_mappings()
    RETURNS bigint AS $$
    BEGIN
      RETURN (SELECT COUNT(DISTINCT lga_id) FROM postcode_lga_mapping);
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  console.log('Note: RPC functions need to be created via Supabase migrations');
}

// RUN THE SCANNER
async function main() {
  const scanner = new RealIntegrityScanner();
  await scanner.scanEverything();
}

main().catch(console.error);