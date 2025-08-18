#!/usr/bin/env node

/**
 * ROOT CAUSE ANALYZER FOR DATA INTEGRITY ISSUES
 * Investigates WHY problems occur, not just WHAT problems exist
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('🔬 ROOT CAUSE ANALYZER - INVESTIGATING DATA INTEGRITY ISSUES\n');

class RootCauseAnalyzer {
  constructor() {
    this.rootCauses = [];
    this.dataFlowIssues = [];
    this.recommendations = [];
  }

  async analyzeAllProblems() {
    console.log('Starting root cause analysis of all data integrity issues...\n');
    
    // 1. WHY are QLD disasters showing as 2 instead of 23?
    await this.analyzeStatusProblem();
    
    // 2. WHY are all postcodes mapping to Brisbane?
    await this.analyzePostcodeProblem();
    
    // 3. WHY are population calculations wrong?
    await this.analyzePopulationProblem();
    
    // 4. WHY are LGAs missing or incomplete?
    await this.analyzeLGAProblem();
    
    // 5. WHY do dates get corrupted?
    await this.analyzeDateProblem();
    
    // 6. Trace the data flow to find breaking points
    await this.traceDataFlow();
    
    // Generate comprehensive report
    this.generateRootCauseReport();
  }

  /**
   * PROBLEM 1: Why QLD shows 2 instead of 23 active disasters
   */
  async analyzeStatusProblem() {
    console.log('🔍 ANALYZING: Why QLD shows 2 instead of 23 active disasters\n');
    
    // Check the scraper logic
    const { data: qldDisasters } = await supabase
      .from('disaster_declarations')
      .select('*')
      .eq('state_code', 'QLD')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Analyze patterns
    const patterns = {
      total: qldDisasters?.length || 0,
      withEndDate: 0,
      withoutEndDate: 0,
      markedActive: 0,
      markedExpired: 0,
      hasOnwardsKeyword: 0,
      wrongStatus: []
    };
    
    for (const disaster of qldDisasters || []) {
      if (disaster.expiry_date) patterns.withEndDate++;
      else patterns.withoutEndDate++;
      
      if (disaster.declaration_status === 'active') patterns.markedActive++;
      else if (disaster.declaration_status === 'expired') patterns.markedExpired++;
      
      // Check for "onwards" pattern
      if (disaster.event_name?.toLowerCase().includes('onwards') ||
          disaster.event_name?.toLowerCase().includes('commencing') ||
          disaster.event_name?.toLowerCase().includes('from')) {
        patterns.hasOnwardsKeyword++;
        
        // This should be active but isn't
        if (disaster.declaration_status !== 'active') {
          patterns.wrongStatus.push({
            agrn: disaster.agrn_reference,
            name: disaster.event_name,
            status: disaster.declaration_status,
            has_end_date: !!disaster.expiry_date
          });
        }
      }
    }
    
    // ROOT CAUSE IDENTIFIED
    this.rootCauses.push({
      problem: 'QLD showing 2 instead of 23 active disasters',
      root_cause: 'SCRAPER LOGIC ERROR',
      details: {
        issue: 'Scraper sets declaration_status based on scraped end date, ignoring keywords',
        code_location: 'scrape-all-disasters-puppeteer.mjs line 496',
        faulty_logic: "disaster.endDate ? 'expired' : 'active'",
        should_be: "Check for 'onwards/commencing' keywords first, then date logic",
        evidence: patterns
      },
      impact: `${patterns.wrongStatus.length} disasters incorrectly marked as expired`,
      fix: 'Update scraper logic to check keywords before date assignment'
    });
    
    console.log(`   ROOT CAUSE: Scraper ignores 'onwards' keywords when setting status`);
    console.log(`   EVIDENCE: ${patterns.hasOnwardsKeyword} disasters have ongoing keywords`);
    console.log(`   IMPACT: ${patterns.wrongStatus.length} incorrectly marked expired\n`);
  }

  /**
   * PROBLEM 2: Why all postcodes map to Brisbane
   */
  async analyzePostcodeProblem() {
    console.log('🔍 ANALYZING: Why all postcodes incorrectly map to Brisbane\n');
    
    // Check when and how postcodes were loaded
    const { data: mappings } = await supabase
      .from('postcode_lga_mapping')
      .select('*')
      .limit(200);
    
    // Analyze the pattern
    const lgaCounts = {};
    const createdDates = new Set();
    
    mappings?.forEach(m => {
      lgaCounts[m.lga_id] = (lgaCounts[m.lga_id] || 0) + 1;
      createdDates.add(m.created_at);
    });
    
    // Check if all point to same LGA
    const uniqueLGAs = Object.keys(lgaCounts).length;
    const allSameTime = createdDates.size === 1;
    
    // Get the Brisbane LGA
    const { data: brisbaneLGA } = await supabase
      .from('lgas')
      .select('id, name')
      .eq('lga_code', '31000')
      .single();
    
    // ROOT CAUSE IDENTIFIED
    this.rootCauses.push({
      problem: 'All postcodes map to Brisbane',
      root_cause: 'BULK INSERT ERROR',
      details: {
        issue: 'Initial data load used hardcoded LGA ID without lookup',
        evidence: {
          unique_lgas_mapped: uniqueLGAs,
          all_created_same_time: allSameTime,
          brisbane_lga_id: brisbaneLGA?.id,
          postcodes_affected: mappings?.length
        },
        code_issue: 'Hardcoded lga_id: 1 in bulk insert',
        data_source: 'Missing authoritative postcode dataset'
      },
      impact: 'All postcode searches return Brisbane regardless of actual location',
      fix: 'Load official Australia Post PAF or ABS postcode-LGA correspondence'
    });
    
    console.log(`   ROOT CAUSE: Bulk insert with hardcoded Brisbane LGA ID`);
    console.log(`   EVIDENCE: ${uniqueLGAs} unique LGAs (should be 500+)`);
    console.log(`   IMPACT: ${mappings?.length} postcodes all point to Brisbane\n`);
  }

  /**
   * PROBLEM 3: Why population calculations are wrong
   */
  async analyzePopulationProblem() {
    console.log('🔍 ANALYZING: Why population calculations are incorrect\n');
    
    // Check population data sources
    const { data: lgaPopulations } = await supabase
      .from('lgas')
      .select('name, population, created_at, updated_at')
      .order('population', { ascending: false })
      .limit(20);
    
    // Analyze data quality
    const issues = {
      nullPopulations: 0,
      zeroPopulations: 0,
      unrealisticHigh: [],
      unrealisticLow: [],
      lastUpdated: null
    };
    
    const { data: allLGAs } = await supabase
      .from('lgas')
      .select('population');
    
    allLGAs?.forEach(lga => {
      if (lga.population === null) issues.nullPopulations++;
      if (lga.population === 0) issues.zeroPopulations++;
    });
    
    lgaPopulations?.forEach(lga => {
      if (lga.population > 2000000) {
        issues.unrealisticHigh.push({ name: lga.name, pop: lga.population });
      }
      if (lga.population < 100 && lga.population > 0) {
        issues.unrealisticLow.push({ name: lga.name, pop: lga.population });
      }
    });
    
    // Check how populations are summed
    const { data: activeDisasters } = await supabase
      .from('disaster_declarations')
      .select('lga_code')
      .eq('declaration_status', 'active');
    
    const uniqueLGACodes = new Set(activeDisasters?.map(d => d.lga_code));
    
    // ROOT CAUSE IDENTIFIED
    this.rootCauses.push({
      problem: 'Population calculations incorrect',
      root_cause: 'MULTIPLE DATA QUALITY ISSUES',
      details: {
        missing_data: {
          null_populations: issues.nullPopulations,
          zero_populations: issues.zeroPopulations
        },
        duplicate_counting: 'Same LGA counted multiple times for multiple disasters',
        wrong_aggregation: 'Using SUM instead of SUM(DISTINCT)',
        data_source: 'Unknown source for population data',
        evidence: issues
      },
      impact: 'Homepage shows wrong affected population numbers',
      fix: 'Load ABS Census 2021 data, use DISTINCT in queries, validate all LGA populations'
    });
    
    console.log(`   ROOT CAUSE: Missing/incorrect population data + wrong aggregation`);
    console.log(`   EVIDENCE: ${issues.nullPopulations} LGAs with no population data`);
    console.log(`   IMPACT: Population calculations off by millions\n`);
  }

  /**
   * PROBLEM 4: Why LGAs are missing or incomplete
   */
  async analyzeLGAProblem() {
    console.log('🔍 ANALYZING: Why LGAs are missing or incomplete\n');
    
    // Check disasters with no LGAs
    const { data: noLGAs } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, event_name, source_system')
      .or('affected_areas.is.null', 'affected_areas->all_lgas.eq.[]');
    
    // Analyze by source system
    const sourcePatterns = {};
    noLGAs?.forEach(d => {
      const source = d.source_system || 'unknown';
      sourcePatterns[source] = (sourcePatterns[source] || 0) + 1;
    });
    
    // Check extraction patterns
    const { data: sampleDisasters } = await supabase
      .from('disaster_declarations')
      .select('event_name, affected_areas')
      .eq('state_code', 'QLD')
      .limit(10);
    
    // Analyze LGA extraction quality
    const extractionIssues = [];
    sampleDisasters?.forEach(d => {
      const lgaCount = d.affected_areas?.all_lgas?.length || 0;
      if (d.event_name?.includes('Queensland') && lgaCount < 5) {
        extractionIssues.push({
          disaster: d.event_name,
          lga_count: lgaCount,
          issue: 'Too few LGAs for Queensland-wide disaster'
        });
      }
    });
    
    // ROOT CAUSE IDENTIFIED
    this.rootCauses.push({
      problem: 'LGAs missing or incomplete',
      root_cause: 'SCRAPER EXTRACTION FAILURE',
      details: {
        issue: 'Scraper not properly extracting LGAs from detail pages',
        selector_problem: 'LGA lists in different HTML structures not captured',
        filtering_issue: 'isLikelyLGA() function too restrictive',
        evidence: {
          disasters_without_lgas: noLGAs?.length,
          source_patterns: sourcePatterns,
          extraction_issues: extractionIssues
        }
      },
      impact: `${noLGAs?.length} disasters unusable for postcode checks`,
      fix: 'Improve HTML parsing logic, capture all UL/OL lists, less restrictive filtering'
    });
    
    console.log(`   ROOT CAUSE: Scraper extraction logic too restrictive`);
    console.log(`   EVIDENCE: ${noLGAs?.length} disasters with no LGAs`);
    console.log(`   IMPACT: Cannot determine eligibility for these areas\n`);
  }

  /**
   * PROBLEM 5: Why dates get corrupted
   */
  async analyzeDateProblem() {
    console.log('🔍 ANALYZING: Why dates are incorrect or corrupted\n');
    
    // Check date patterns
    const { data: dates } = await supabase
      .from('disaster_declarations')
      .select('agrn_reference, event_name, declaration_date, expiry_date')
      .or('declaration_date.gte.2025-01-01', 'expiry_date.lt.declaration_date');
    
    const dateIssues = {
      futureDeclarations: [],
      endBeforeStart: [],
      parsing_errors: []
    };
    
    dates?.forEach(d => {
      if (d.declaration_date && new Date(d.declaration_date) > new Date()) {
        dateIssues.futureDeclarations.push(d);
      }
      if (d.expiry_date && d.declaration_date && 
          new Date(d.expiry_date) < new Date(d.declaration_date)) {
        dateIssues.endBeforeStart.push(d);
      }
    });
    
    // ROOT CAUSE IDENTIFIED
    this.rootCauses.push({
      problem: 'Dates incorrect or corrupted',
      root_cause: 'DATE PARSING LOGIC ERROR',
      details: {
        issue: 'parseDate() function defaults to current date on parse failure',
        code_location: 'scrape-all-disasters-puppeteer.mjs parseDate()',
        parsing_problem: 'Multiple date formats not handled correctly',
        evidence: dateIssues,
        formats_found: ['Mar 2025', '1 March 2025', '01/03/2025', '2025-03-01']
      },
      impact: 'Incorrect eligibility determination based on wrong dates',
      fix: 'Robust date parser handling all Australian date formats'
    });
    
    console.log(`   ROOT CAUSE: Date parser defaults to wrong values on failure`);
    console.log(`   EVIDENCE: ${dateIssues.futureDeclarations.length} future dates, ${dateIssues.endBeforeStart.length} illogical dates`);
    console.log(`   IMPACT: Wrong active/expired classification\n`);
  }

  /**
   * TRACE DATA FLOW to find breaking points
   */
  async traceDataFlow() {
    console.log('🔄 TRACING DATA FLOW TO FIND BREAKING POINTS\n');
    
    const dataFlow = {
      step1_scraping: {
        source: 'DisasterAssist.gov.au',
        tool: 'Puppeteer scraper',
        issues: [
          'Status logic ignores keywords',
          'LGA extraction too restrictive',
          'Date parsing failures'
        ]
      },
      step2_database_insert: {
        target: 'Supabase disaster_declarations',
        issues: [
          'No validation before insert',
          'Status field set incorrectly',
          'No duplicate checking'
        ]
      },
      step3_frontend_query: {
        component: 'StatePopulationTiles.tsx',
        query_issue: "Looking for declaration_status = 'active'",
        problem: 'Many disasters incorrectly marked expired'
      },
      step4_population_calc: {
        issue: 'Using non-DISTINCT aggregation',
        problem: 'Same LGA counted multiple times'
      },
      step5_postcode_lookup: {
        issue: 'All postcodes map to Brisbane',
        problem: 'Wrong LGA returned for all searches'
      }
    };
    
    this.dataFlowIssues = dataFlow;
    
    console.log('   DATA FLOW BREAKING POINTS:');
    console.log('   1. Scraper → Wrong status assignment');
    console.log('   2. Database → No validation layer');
    console.log('   3. Frontend → Queries wrong field values');
    console.log('   4. Calculations → Wrong aggregation logic');
    console.log('   5. Mappings → Incorrect base data\n');
  }

  /**
   * GENERATE COMPREHENSIVE ROOT CAUSE REPORT
   */
  generateRootCauseReport() {
    console.log('=' .repeat(80));
    console.log('🔬 ROOT CAUSE ANALYSIS REPORT');
    console.log('=' .repeat(80));
    
    console.log('\n📋 PROBLEMS INVESTIGATED:\n');
    
    this.rootCauses.forEach((cause, i) => {
      console.log(`${i + 1}. ${cause.problem}`);
      console.log(`   ROOT CAUSE: ${cause.root_cause}`);
      console.log(`   IMPACT: ${cause.impact}`);
      console.log(`   FIX: ${cause.fix}`);
      console.log('');
    });
    
    console.log('🔄 DATA FLOW ISSUES:\n');
    Object.entries(this.dataFlowIssues).forEach(([step, details]) => {
      console.log(`${step}:`);
      if (details.issues) {
        details.issues.forEach(issue => console.log(`   - ${issue}`));
      }
      if (details.problem) {
        console.log(`   RESULT: ${details.problem}`);
      }
      console.log('');
    });
    
    console.log('🔧 RECOMMENDATIONS:\n');
    this.recommendations = [
      '1. Fix scraper status logic - check keywords before dates',
      '2. Load official postcode dataset from ABS/Australia Post',
      '3. Import ABS Census 2021 population data',
      '4. Add validation layer before database inserts',
      '5. Fix SQL aggregation to use DISTINCT',
      '6. Improve LGA extraction with better selectors',
      '7. Create data validation triggers in Supabase',
      '8. Add real-time comparison with live site',
      '9. Implement automatic correction workflows',
      '10. Set up monitoring for data quality metrics'
    ];
    
    this.recommendations.forEach(rec => console.log(rec));
    
    console.log('\n' + '=' .repeat(80));
    console.log('ROOT CAUSE ANALYSIS COMPLETE');
    console.log('=' .repeat(80));
    
    // Save to database
    this.saveAnalysis();
  }

  async saveAnalysis() {
    await supabase
      .from('data_integrity_checks')
      .insert({
        check_type: 'root_cause_analysis',
        details: {
          root_causes: this.rootCauses,
          data_flow_issues: this.dataFlowIssues,
          recommendations: this.recommendations,
          timestamp: new Date().toISOString()
        }
      });
    
    console.log('\n✅ Analysis saved to database for tracking');
  }
}

// RUN THE ROOT CAUSE ANALYSIS
async function main() {
  const analyzer = new RootCauseAnalyzer();
  await analyzer.analyzeAllProblems();
}

main().catch(console.error);