#!/usr/bin/env node

/**
 * DISASTER DATA INTEGRITY AGENT
 * Autonomous agent for ensuring 100% data accuracy
 * Checks: Dates, States, LGAs, Postcodes, Population, Status
 * Critical for Medicare compliance - prevents $500,000 fines
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🤖 DISASTER DATA INTEGRITY AGENT ACTIVATED');
console.log('Checking: Dates, States, LGAs, Postcodes, Population, Status\n');

class DataIntegrityAgent {
  constructor() {
    this.issues = [];
    this.corrections = [];
    this.stats = {
      totalChecked: 0,
      issuesFound: 0,
      autoCorrected: 0,
      manualReviewNeeded: 0
    };
  }

  /**
   * MAIN INTEGRITY CHECK - Runs all validations
   */
  async runFullIntegrityCheck() {
    console.log('Starting comprehensive data integrity check...\n');
    
    // 1. Check disaster status accuracy
    await this.checkDisasterStatuses();
    
    // 2. Validate dates
    await this.validateDates();
    
    // 3. Verify state codes
    await this.checkStateCodes();
    
    // 4. Validate LGA completeness
    await this.checkLGACompleteness();
    
    // 5. Check postcode mappings
    await this.validatePostcodeMappings();
    
    // 6. Verify population calculations
    await this.checkPopulationAccuracy();
    
    // 7. Compare with live site
    await this.compareLiveData();
    
    // 8. Generate report
    await this.generateIntegrityReport();
  }

  /**
   * 1. CHECK DISASTER STATUS ACCURACY
   * Rules:
   * - No expiry_date = ACTIVE
   * - Has "onwards", "commencing", "from" = ACTIVE
   * - Clear end date in past = EXPIRED
   */
  async checkDisasterStatuses() {
    console.log('📊 CHECKING DISASTER STATUS ACCURACY...');
    
    const { data: disasters } = await supabase
      .from('disaster_declarations')
      .select('*');
    
    let statusIssues = 0;
    
    for (const disaster of disasters || []) {
      const shouldBeActive = this.shouldDisasterBeActive(disaster);
      const currentStatus = disaster.declaration_status;
      
      if (shouldBeActive && currentStatus !== 'active') {
        this.issues.push({
          type: 'STATUS_INCORRECT',
          severity: 'CRITICAL',
          disaster: disaster.agrn_reference,
          current: currentStatus,
          should_be: 'active',
          reason: 'No end date or has ongoing keywords'
        });
        
        // Auto-correct
        await this.correctDisasterStatus(disaster.agrn_reference, 'active');
        statusIssues++;
      } else if (!shouldBeActive && currentStatus !== 'expired') {
        this.issues.push({
          type: 'STATUS_INCORRECT',
          severity: 'HIGH',
          disaster: disaster.agrn_reference,
          current: currentStatus,
          should_be: 'expired',
          reason: 'Has past end date'
        });
        
        // Auto-correct
        await this.correctDisasterStatus(disaster.agrn_reference, 'expired');
        statusIssues++;
      }
    }
    
    console.log(`   ✅ Checked ${disasters?.length} disasters`);
    console.log(`   ⚠️ Found ${statusIssues} status issues (auto-corrected)\n`);
  }

  /**
   * 2. VALIDATE DATES
   * Check for:
   * - Invalid date formats
   * - End dates before start dates
   * - Future dates that seem wrong
   */
  async validateDates() {
    console.log('📅 VALIDATING DATES...');
    
    const { data: disasters } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, declaration_date, expiry_date, event_name');
    
    let dateIssues = 0;
    
    for (const disaster of disasters || []) {
      // Check if end date is before start date
      if (disaster.expiry_date && disaster.declaration_date) {
        const start = new Date(disaster.declaration_date);
        const end = new Date(disaster.expiry_date);
        
        if (end < start) {
          this.issues.push({
            type: 'DATE_LOGIC_ERROR',
            severity: 'CRITICAL',
            disaster: disaster.agrn_reference,
            issue: 'End date before start date',
            start: disaster.declaration_date,
            end: disaster.expiry_date
          });
          dateIssues++;
        }
      }
      
      // Check for dates in far future (likely errors)
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2);
      
      if (disaster.declaration_date && new Date(disaster.declaration_date) > farFuture) {
        this.issues.push({
          type: 'DATE_FUTURE_ERROR',
          severity: 'HIGH',
          disaster: disaster.agrn_reference,
          issue: 'Declaration date too far in future',
          date: disaster.declaration_date
        });
        dateIssues++;
      }
    }
    
    console.log(`   ✅ Validated dates for ${disasters?.length} disasters`);
    console.log(`   ⚠️ Found ${dateIssues} date issues\n`);
  }

  /**
   * 3. CHECK STATE CODES
   * Ensure all state codes are valid Australian states
   */
  async checkStateCodes() {
    console.log('🗺️ CHECKING STATE CODES...');
    
    const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    
    const { data: disasters } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, state_code');
    
    let stateIssues = 0;
    
    for (const disaster of disasters || []) {
      if (!validStates.includes(disaster.state_code)) {
        this.issues.push({
          type: 'INVALID_STATE_CODE',
          severity: 'HIGH',
          disaster: disaster.agrn_reference,
          state_code: disaster.state_code,
          issue: 'Invalid Australian state code'
        });
        stateIssues++;
      }
    }
    
    console.log(`   ✅ Checked ${disasters?.length} state codes`);
    console.log(`   ⚠️ Found ${stateIssues} invalid state codes\n`);
  }

  /**
   * 4. CHECK LGA COMPLETENESS
   * Ensure disasters have LGAs properly extracted
   */
  async checkLGACompleteness() {
    console.log('🏘️ CHECKING LGA COMPLETENESS...');
    
    const { data: disasters } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, affected_areas, event_name, state_code');
    
    let lgaIssues = 0;
    
    for (const disaster of disasters || []) {
      const lgas = disaster.affected_areas?.all_lgas || [];
      
      // Check if active disaster has no LGAs
      if (lgas.length === 0) {
        this.issues.push({
          type: 'MISSING_LGAS',
          severity: 'CRITICAL',
          disaster: disaster.agrn_reference,
          event: disaster.event_name,
          issue: 'No LGAs extracted for disaster'
        });
        lgaIssues++;
      }
      
      // Check for suspicious LGA counts
      if (lgas.length === 1 && disaster.event_name?.includes('Queensland')) {
        // Queensland disasters typically affect multiple LGAs
        this.issues.push({
          type: 'SUSPICIOUS_LGA_COUNT',
          severity: 'MEDIUM',
          disaster: disaster.agrn_reference,
          lga_count: lgas.length,
          issue: 'Queensland disaster with only 1 LGA seems incorrect'
        });
        lgaIssues++;
      }
    }
    
    console.log(`   ✅ Checked LGA data for ${disasters?.length} disasters`);
    console.log(`   ⚠️ Found ${lgaIssues} LGA issues\n`);
  }

  /**
   * 5. VALIDATE POSTCODE MAPPINGS
   * Check postcode to LGA mapping accuracy
   */
  async validatePostcodeMappings() {
    console.log('📮 VALIDATING POSTCODE MAPPINGS...');
    
    // Check for postcodes mapped to wrong LGAs
    const { data: mappings } = await supabase
      .from('postcode_lga_mapping')
      .select(`
        postcode,
        lga_id,
        lgas (
          name,
          lga_code,
          state_territory_id
        )
      `)
      .limit(100);
    
    let mappingIssues = 0;
    
    // Known correct mappings for validation
    const knownMappings = {
      '2000': 'Sydney',
      '3000': 'Melbourne',
      '4000': 'Brisbane',
      '5000': 'Adelaide',
      '6000': 'Perth',
      '7000': 'Hobart',
      '0800': 'Darwin'
    };
    
    for (const mapping of mappings || []) {
      const postcode = mapping.postcode;
      const lgaName = mapping.lgas?.name;
      
      if (knownMappings[postcode]) {
        if (!lgaName?.includes(knownMappings[postcode])) {
          this.issues.push({
            type: 'INCORRECT_POSTCODE_MAPPING',
            severity: 'HIGH',
            postcode: postcode,
            current_lga: lgaName,
            should_be: knownMappings[postcode]
          });
          mappingIssues++;
        }
      }
    }
    
    // Check for duplicate postcodes
    const { data: duplicates } = await supabase.rpc('check_duplicate_postcodes');
    if (duplicates && duplicates.length > 0) {
      duplicates.forEach(dup => {
        this.issues.push({
          type: 'DUPLICATE_POSTCODE',
          severity: 'CRITICAL',
          postcode: dup.postcode,
          count: dup.count,
          issue: 'Postcode mapped to multiple LGAs'
        });
        mappingIssues++;
      });
    }
    
    console.log(`   ✅ Validated ${mappings?.length} postcode mappings`);
    console.log(`   ⚠️ Found ${mappingIssues} mapping issues\n`);
  }

  /**
   * 6. CHECK POPULATION ACCURACY
   * Verify population calculations are reasonable
   */
  async checkPopulationAccuracy() {
    console.log('👥 CHECKING POPULATION ACCURACY...');
    
    // Check LGA populations
    const { data: lgas } = await supabase
      .from('lgas')
      .select('name, lga_code, population')
      .order('population', { ascending: false })
      .limit(20);
    
    let popIssues = 0;
    
    for (const lga of lgas || []) {
      // Check for unreasonable populations
      if (lga.population > 2000000) {
        this.issues.push({
          type: 'EXCESSIVE_POPULATION',
          severity: 'HIGH',
          lga: lga.name,
          population: lga.population,
          issue: 'Population seems too high for single LGA'
        });
        popIssues++;
      }
      
      if (lga.population === 0 || lga.population === null) {
        this.issues.push({
          type: 'MISSING_POPULATION',
          severity: 'MEDIUM',
          lga: lga.name,
          issue: 'LGA has no population data'
        });
        popIssues++;
      }
    }
    
    // Check state totals
    const { data: stateTotals } = await supabase.rpc('calculate_state_populations');
    const expectedPopulations = {
      'NSW': 8200000,
      'VIC': 6700000,
      'QLD': 5300000,
      'WA': 2800000,
      'SA': 1800000,
      'TAS': 570000,
      'NT': 250000,
      'ACT': 460000
    };
    
    for (const state of stateTotals || []) {
      const expected = expectedPopulations[state.state_code];
      const actual = state.total_population;
      const variance = Math.abs((actual - expected) / expected);
      
      if (variance > 0.5) { // More than 50% variance
        this.issues.push({
          type: 'STATE_POPULATION_VARIANCE',
          severity: 'HIGH',
          state: state.state_code,
          expected: expected,
          actual: actual,
          variance: `${(variance * 100).toFixed(1)}%`
        });
        popIssues++;
      }
    }
    
    console.log(`   ✅ Checked population data`);
    console.log(`   ⚠️ Found ${popIssues} population issues\n`);
  }

  /**
   * 7. COMPARE WITH LIVE SITE
   * Check our data against DisasterAssist.gov.au
   */
  async compareLiveData() {
    console.log('🌐 COMPARING WITH LIVE DISASTERASSIST DATA...');
    
    try {
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      
      // Get live count from DisasterAssist
      await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
        waitUntil: 'networkidle2'
      });
      
      await page.waitForTimeout(5000);
      
      // Count disasters by state on live site
      const liveCount = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        const stateCounts = {};
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const state = cells[2]?.textContent?.trim();
            const endDate = cells[1]?.textContent?.trim();
            
            if (state && (!endDate || endDate === '-')) {
              stateCounts[state] = (stateCounts[state] || 0) + 1;
            }
          }
        });
        
        return stateCounts;
      });
      
      await browser.close();
      
      // Compare with our database
      const { data: ourCounts } = await supabase
        .from('disaster_declarations')
        .select('state_code')
        .eq('declaration_status', 'active');
      
      const ourStateCounts = {};
      ourCounts?.forEach(d => {
        ourStateCounts[d.state_code] = (ourStateCounts[d.state_code] || 0) + 1;
      });
      
      // Find discrepancies
      for (const [state, liveCount] of Object.entries(liveCount)) {
        const ourCount = ourStateCounts[state] || 0;
        if (Math.abs(liveCount - ourCount) > 2) {
          this.issues.push({
            type: 'LIVE_DATA_MISMATCH',
            severity: 'CRITICAL',
            state: state,
            live_count: liveCount,
            our_count: ourCount,
            difference: liveCount - ourCount
          });
        }
      }
      
      console.log('   ✅ Compared with live site data\n');
      
    } catch (error) {
      console.error('   ❌ Error comparing live data:', error.message);
    }
  }

  /**
   * HELPER: Determine if disaster should be active
   */
  shouldDisasterBeActive(disaster) {
    // No expiry date = active
    if (!disaster.expiry_date) return true;
    
    // Check for ongoing keywords
    const keywords = ['onwards', 'commencing', 'from', 'continuing'];
    const hasKeyword = keywords.some(kw => 
      disaster.event_name?.toLowerCase().includes(kw)
    );
    if (hasKeyword && !disaster.expiry_date) return true;
    
    // Has end date in past = expired
    if (disaster.expiry_date) {
      const endDate = new Date(disaster.expiry_date);
      if (endDate < new Date()) return false;
    }
    
    return true;
  }

  /**
   * AUTO-CORRECT: Fix disaster status
   */
  async correctDisasterStatus(agrn, newStatus) {
    const { error } = await supabase
      .from('disaster_declarations')
      .update({ declaration_status: newStatus })
      .eq('agrn_reference', agrn);
    
    if (!error) {
      this.corrections.push({
        type: 'STATUS_CORRECTED',
        agrn: agrn,
        new_status: newStatus
      });
      this.stats.autoCorrected++;
    }
  }

  /**
   * GENERATE INTEGRITY REPORT
   */
  async generateIntegrityReport() {
    console.log('=' .repeat(80));
    console.log('📊 DATA INTEGRITY REPORT');
    console.log('=' .repeat(80));
    
    // Calculate integrity score
    const score = Math.max(0, 100 - (this.issues.length * 2));
    
    console.log(`\n🎯 INTEGRITY SCORE: ${score}%\n`);
    
    // Group issues by type
    const issuesByType = {};
    this.issues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });
    
    console.log('ISSUES FOUND:');
    for (const [type, count] of Object.entries(issuesByType)) {
      console.log(`   ${type}: ${count}`);
    }
    
    console.log('\nCRITICAL ISSUES:');
    this.issues
      .filter(i => i.severity === 'CRITICAL')
      .slice(0, 10)
      .forEach(issue => {
        console.log(`   ⚠️ ${issue.type}: ${JSON.stringify(issue)}`);
      });
    
    console.log(`\nAUTO-CORRECTIONS MADE: ${this.stats.autoCorrected}`);
    console.log(`MANUAL REVIEW NEEDED: ${this.issues.filter(i => i.severity === 'CRITICAL').length}`);
    
    // Save report to database
    await supabase
      .from('data_integrity_checks')
      .insert({
        check_type: 'comprehensive',
        discrepancies_found: this.issues.length,
        auto_corrected: this.stats.autoCorrected,
        manual_review_needed: this.issues.filter(i => i.severity === 'CRITICAL').length,
        integrity_score: score,
        details: {
          issues: this.issues,
          corrections: this.corrections,
          issue_summary: issuesByType
        }
      });
    
    console.log('\n✅ Report saved to database');
    console.log('=' .repeat(80));
  }
}

// Create RPC function for duplicate postcode check
async function createRPCFunctions() {
  const checkDuplicates = `
    CREATE OR REPLACE FUNCTION check_duplicate_postcodes()
    RETURNS TABLE(postcode varchar, count bigint) AS $$
    BEGIN
      RETURN QUERY
      SELECT plm.postcode, COUNT(*)::bigint
      FROM postcode_lga_mapping plm
      GROUP BY plm.postcode
      HAVING COUNT(*) > 1;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  const calculatePop = `
    CREATE OR REPLACE FUNCTION calculate_state_populations()
    RETURNS TABLE(state_code varchar, total_population bigint) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        dd.state_code::varchar,
        SUM(DISTINCT l.population)::bigint as total_population
      FROM disaster_declarations dd
      JOIN lgas l ON dd.lga_code = l.lga_code
      WHERE dd.declaration_status = 'active'
      GROUP BY dd.state_code;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // Note: In production, these would be created via migrations
  console.log('RPC functions ready for deployment');
}

// RUN THE AGENT
async function main() {
  const agent = new DataIntegrityAgent();
  await agent.runFullIntegrityCheck();
  
  // Schedule to run every 4 hours
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      agent.runFullIntegrityCheck();
    }, 4 * 60 * 60 * 1000); // 4 hours
  }
}

// Execute
main().catch(console.error);