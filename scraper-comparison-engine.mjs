#!/usr/bin/env node

/**
 * SCRAPER COMPARISON ENGINE
 * 
 * Compares results from Puppeteer and Playwright scrapers
 * Ensures 100% data accuracy for Medicare compliance
 * $500,000 fines at stake - accuracy is CRITICAL
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabase = createClient(
  'https://sfbohkqmykagkdmggcxw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
);

console.log('⚖️ SCRAPER COMPARISON ENGINE - Medicare Compliance Validation\n');
console.log('Comparing Puppeteer vs Playwright outputs for 100% accuracy\n');

class ScraperComparisonEngine {
  constructor() {
    this.comparisonId = crypto.randomUUID();
    this.report = {
      id: this.comparisonId,
      timestamp: new Date().toISOString(),
      puppeteer_data: [],
      playwright_data: [],
      total_disasters_compared: 0,
      discrepancies: [],
      validation_checks: [],
      confidence_score: 100,
      passed: true,
      recommendation: 'PENDING'
    };
  }

  /**
   * Load data from both scrapers
   */
  async loadScraperData() {
    console.log('📊 Loading scraper data from database...\n');

    // Load Puppeteer data (production table)
    const { data: puppeteerData, error: puppeteerError } = await supabase
      .from('disaster_declarations')
      .select('*')
      .order('agrn_reference');

    if (puppeteerError) {
      throw new Error(`Failed to load Puppeteer data: ${puppeteerError.message}`);
    }

    // Load Playwright data (test table)
    const { data: playwrightData, error: playwrightError } = await supabase
      .from('test_disaster_declarations')
      .select('*')
      .order('agrn_reference');

    if (playwrightError) {
      throw new Error(`Failed to load Playwright data: ${playwrightError.message}`);
    }

    this.report.puppeteer_data = puppeteerData || [];
    this.report.playwright_data = playwrightData || [];

    console.log(`Loaded ${this.report.puppeteer_data.length} disasters from Puppeteer`);
    console.log(`Loaded ${this.report.playwright_data.length} disasters from Playwright\n`);

    return { puppeteerData, playwrightData };
  }

  /**
   * Compare disaster counts
   */
  compareDisasterCounts() {
    console.log('🔢 Comparing disaster counts...');

    const puppeteerCount = this.report.puppeteer_data.length;
    const playwrightCount = this.report.playwright_data.length;
    const difference = Math.abs(puppeteerCount - playwrightCount);

    const check = {
      name: 'Total Disaster Count',
      puppeteer: puppeteerCount,
      playwright: playwrightCount,
      difference,
      passed: difference === 0,
      severity: difference === 0 ? 'none' : difference > 10 ? 'critical' : 'warning'
    };

    this.report.validation_checks.push(check);

    if (!check.passed) {
      this.report.confidence_score -= difference > 10 ? 30 : 10;
      this.report.discrepancies.push({
        type: 'count_mismatch',
        message: `Disaster count mismatch: Puppeteer has ${puppeteerCount}, Playwright has ${playwrightCount}`,
        severity: check.severity
      });
    }

    console.log(`  Puppeteer: ${puppeteerCount}`);
    console.log(`  Playwright: ${playwrightCount}`);
    console.log(`  Status: ${check.passed ? '✅ MATCHED' : '❌ MISMATCH'}\n`);

    return check;
  }

  /**
   * Compare NULL date preservation (CRITICAL for Medicare)
   */
  compareNullDates() {
    console.log('📅 Comparing NULL date preservation (Medicare Critical)...');

    const puppeteerNulls = this.report.puppeteer_data.filter(d => d.expiry_date === null).length;
    const playwrightNulls = this.report.playwright_data.filter(d => d.expiry_date === null).length;
    const difference = Math.abs(puppeteerNulls - playwrightNulls);

    const check = {
      name: 'NULL Date Preservation',
      puppeteer: puppeteerNulls,
      playwright: playwrightNulls,
      difference,
      passed: difference === 0,
      severity: 'critical' // Always critical for Medicare
    };

    this.report.validation_checks.push(check);

    if (!check.passed) {
      this.report.confidence_score -= 40; // Heavy penalty for NULL date mismatch
      this.report.passed = false; // Automatic failure
      this.report.discrepancies.push({
        type: 'null_date_mismatch',
        message: `NULL date count mismatch: Puppeteer has ${puppeteerNulls}, Playwright has ${playwrightNulls}`,
        severity: 'critical',
        impact: 'Medicare telehealth eligibility will be incorrect'
      });
    }

    console.log(`  Puppeteer NULL dates: ${puppeteerNulls}`);
    console.log(`  Playwright NULL dates: ${playwrightNulls}`);
    console.log(`  Status: ${check.passed ? '✅ MATCHED' : '❌ CRITICAL FAILURE'}\n`);

    return check;
  }

  /**
   * Compare state counts (QLD and WA are critical)
   */
  compareStateCounts() {
    console.log('🗺️ Comparing state counts...');

    const puppeteerStates = {};
    const playwrightStates = {};

    this.report.puppeteer_data.forEach(d => {
      if (d.declaration_status === 'active') {
        puppeteerStates[d.state_code] = (puppeteerStates[d.state_code] || 0) + 1;
      }
    });

    this.report.playwright_data.forEach(d => {
      if (d.declaration_status === 'active') {
        playwrightStates[d.state_code] = (playwrightStates[d.state_code] || 0) + 1;
      }
    });

    const stateChecks = [];
    const criticalStates = ['QLD', 'WA']; // Known to have specific counts

    // Check each state
    const allStates = new Set([...Object.keys(puppeteerStates), ...Object.keys(playwrightStates)]);
    
    allStates.forEach(state => {
      const puppeteerCount = puppeteerStates[state] || 0;
      const playwrightCount = playwrightStates[state] || 0;
      const difference = Math.abs(puppeteerCount - playwrightCount);

      const check = {
        state,
        puppeteer: puppeteerCount,
        playwright: playwrightCount,
        difference,
        passed: difference === 0,
        critical: criticalStates.includes(state)
      };

      stateChecks.push(check);

      if (!check.passed) {
        const severity = check.critical ? 'critical' : 'warning';
        this.report.confidence_score -= check.critical ? 15 : 5;
        
        this.report.discrepancies.push({
          type: 'state_count_mismatch',
          state,
          message: `${state} active count mismatch: Puppeteer has ${puppeteerCount}, Playwright has ${playwrightCount}`,
          severity
        });
      }

      console.log(`  ${state}: Puppeteer=${puppeteerCount}, Playwright=${playwrightCount} ${check.passed ? '✅' : '❌'}`);
    });

    // Special validation for QLD (should be 20-30)
    const qldPuppeteer = puppeteerStates['QLD'] || 0;
    const qldPlaywright = playwrightStates['QLD'] || 0;
    
    if ((qldPuppeteer < 20 || qldPuppeteer > 30) || (qldPlaywright < 20 || qldPlaywright > 30)) {
      this.report.confidence_score -= 20;
      this.report.discrepancies.push({
        type: 'qld_range_violation',
        message: `QLD active count outside expected range (20-30): Puppeteer=${qldPuppeteer}, Playwright=${qldPlaywright}`,
        severity: 'critical'
      });
    }

    // Special validation for WA (should be 30-45)
    const waPuppeteer = puppeteerStates['WA'] || 0;
    const waPlaywright = playwrightStates['WA'] || 0;
    
    if ((waPuppeteer < 30 || waPuppeteer > 45) || (waPlaywright < 30 || waPlaywright > 45)) {
      this.report.confidence_score -= 20;
      this.report.discrepancies.push({
        type: 'wa_range_violation',
        message: `WA active count outside expected range (30-45): Puppeteer=${waPuppeteer}, Playwright=${waPlaywright}`,
        severity: 'critical'
      });
    }

    this.report.validation_checks.push({
      name: 'State Count Validation',
      checks: stateChecks,
      passed: stateChecks.every(c => c.passed)
    });

    console.log('');
    return stateChecks;
  }

  /**
   * Compare individual disasters (AGRN by AGRN)
   */
  async compareIndividualDisasters() {
    console.log('🔍 Comparing individual disasters...\n');

    const puppeteerMap = new Map(
      this.report.puppeteer_data.map(d => [d.agrn_reference, d])
    );
    const playwrightMap = new Map(
      this.report.playwright_data.map(d => [d.agrn_reference, d])
    );

    const allAGRNs = new Set([...puppeteerMap.keys(), ...playwrightMap.keys()]);
    let mismatches = 0;

    for (const agrn of allAGRNs) {
      const puppeteerDisaster = puppeteerMap.get(agrn);
      const playwrightDisaster = playwrightMap.get(agrn);

      if (!puppeteerDisaster || !playwrightDisaster) {
        mismatches++;
        this.report.discrepancies.push({
          type: 'missing_disaster',
          agrn,
          message: `Disaster ${agrn} missing in ${!puppeteerDisaster ? 'Puppeteer' : 'Playwright'}`,
          severity: 'critical'
        });
        this.report.confidence_score -= 5;
        continue;
      }

      // Compare critical fields
      const criticalFields = [
        'declaration_status',
        'expiry_date',
        'state_code'
      ];

      for (const field of criticalFields) {
        if (puppeteerDisaster[field] !== playwrightDisaster[field]) {
          mismatches++;
          this.report.discrepancies.push({
            type: 'field_mismatch',
            agrn,
            field,
            puppeteer_value: puppeteerDisaster[field],
            playwright_value: playwrightDisaster[field],
            message: `${agrn} ${field} mismatch`,
            severity: field === 'expiry_date' ? 'critical' : 'warning'
          });
          this.report.confidence_score -= field === 'expiry_date' ? 10 : 3;
        }
      }

      // Compare LGA counts
      const puppeteerLGAs = puppeteerDisaster.affected_areas?.all_lgas?.length || 0;
      const playwrightLGAs = playwrightDisaster.affected_areas?.all_lgas?.length || 0;
      
      if (Math.abs(puppeteerLGAs - playwrightLGAs) > 2) {
        mismatches++;
        this.report.discrepancies.push({
          type: 'lga_count_mismatch',
          agrn,
          puppeteer_lgas: puppeteerLGAs,
          playwright_lgas: playwrightLGAs,
          message: `${agrn} LGA count differs significantly`,
          severity: 'warning'
        });
        this.report.confidence_score -= 2;
      }
    }

    this.report.total_disasters_compared = allAGRNs.size;
    
    console.log(`Compared ${allAGRNs.size} disasters`);
    console.log(`Found ${mismatches} mismatches\n`);

    return mismatches;
  }

  /**
   * Generate final recommendation
   */
  generateRecommendation() {
    console.log('📊 Generating final recommendation...\n');

    // Ensure confidence doesn't go below 0
    this.report.confidence_score = Math.max(0, this.report.confidence_score);

    // Determine pass/fail
    if (this.report.confidence_score >= 95) {
      this.report.passed = true;
      this.report.recommendation = 'SAFE TO RUN';
    } else if (this.report.confidence_score >= 85) {
      this.report.passed = false;
      this.report.recommendation = 'NEEDS REVIEW';
    } else {
      this.report.passed = false;
      this.report.recommendation = 'DO NOT RUN';
    }

    // Check for critical failures
    const hasCriticalFailure = this.report.discrepancies.some(d => d.severity === 'critical');
    if (hasCriticalFailure) {
      this.report.passed = false;
      if (this.report.recommendation === 'SAFE TO RUN') {
        this.report.recommendation = 'NEEDS REVIEW';
      }
    }

    return this.report;
  }

  /**
   * Save comparison report
   */
  async saveReport() {
    // Save to file
    const reportPath = `./evidence/comparison_${this.comparisonId}.json`;
    await fs.mkdir('./evidence', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.report, null, 2));

    // Save to database
    const { error } = await supabase
      .from('scraper_comparison_reports')
      .insert({
        id: this.comparisonId,
        created_at: this.report.timestamp,
        puppeteer_count: this.report.puppeteer_data.length,
        playwright_count: this.report.playwright_data.length,
        disasters_compared: this.report.total_disasters_compared,
        discrepancies: this.report.discrepancies,
        confidence_score: this.report.confidence_score,
        passed: this.report.passed,
        recommendation: this.report.recommendation,
        report_path: reportPath
      });

    if (error) {
      console.error('Failed to save report to database:', error);
    }

    return reportPath;
  }

  /**
   * Run complete comparison
   */
  async runComparison() {
    try {
      // Load data
      await this.loadScraperData();

      // Run comparisons
      this.compareDisasterCounts();
      this.compareNullDates();
      this.compareStateCounts();
      await this.compareIndividualDisasters();

      // Generate recommendation
      this.generateRecommendation();

      // Save report
      const reportPath = await this.saveReport();

      // Display results
      console.log('='.repeat(80));
      console.log('⚖️ COMPARISON COMPLETE');
      console.log('='.repeat(80));
      console.log(`Comparison ID: ${this.comparisonId}`);
      console.log(`Confidence Score: ${this.report.confidence_score}%`);
      console.log(`Status: ${this.report.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Recommendation: ${this.report.recommendation}`);
      console.log(`Discrepancies Found: ${this.report.discrepancies.length}`);
      
      if (this.report.discrepancies.length > 0) {
        console.log('\n🚨 CRITICAL DISCREPANCIES:');
        this.report.discrepancies
          .filter(d => d.severity === 'critical')
          .forEach(d => {
            console.log(`  - ${d.message}`);
          });
      }

      console.log(`\n💾 Report saved to: ${reportPath}`);
      console.log('='.repeat(80));

      // Return exit code based on pass/fail
      process.exit(this.report.passed ? 0 : 1);

    } catch (error) {
      console.error('❌ Comparison failed:', error);
      process.exit(1);
    }
  }
}

// Run the comparison
const engine = new ScraperComparisonEngine();
engine.runComparison().catch(console.error);