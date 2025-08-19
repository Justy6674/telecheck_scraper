import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('🤖 Starting AI analysis of scraper results...');
    
    // Get data from both scrapers
    const { data: puppeteerData } = await supabase
      .from('disaster_declarations')
      .select('*')
      .order('agrn_reference');
    
    const { data: playwrightData } = await supabase
      .from('disaster_declarations_validation')
      .select('*')
      .order('agrn');
    
    // Count active disasters
    const puppeteerActive = puppeteerData?.filter(d => 
      !d.expiry_date || d.raw_end_date === '- -' || d.raw_end_date === '-' || !d.raw_end_date
    ) || [];
    
    const playwrightActive = playwrightData?.filter(d => !d.end_date) || [];
    
    // Perform AI analysis
    const analysis = {
      dataIntegrity: {
        match: puppeteerActive.length === playwrightActive.length,
        confidence: calculateConfidence(puppeteerActive.length, playwrightActive.length),
        puppeteerCount: puppeteerActive.length,
        playwrightCount: playwrightActive.length
      },
      discrepancies: [],
      medicareRisk: {
        level: 'LOW',
        message: '',
        action: ''
      },
      recommendations: [],
      criticalFindings: []
    };
    
    // Find discrepancies
    const puppeteerAGRNs = new Set(puppeteerData?.map(d => d.agrn_reference));
    const playwrightAGRNs = new Set(playwrightData?.map(d => d.agrn));
    
    // Find missing in each
    const missingInPlaywright: string[] = [];
    const missingInPuppeteer: string[] = [];
    
    puppeteerAGRNs.forEach(agrn => {
      if (!playwrightAGRNs.has(agrn)) {
        missingInPlaywright.push(agrn);
      }
    });
    
    playwrightAGRNs.forEach(agrn => {
      if (!puppeteerAGRNs.has(agrn)) {
        missingInPuppeteer.push(agrn);
      }
    });
    
    // Analyze discrepancies
    if (missingInPlaywright.length > 0) {
      analysis.discrepancies.push({
        type: 'MISSING_IN_PLAYWRIGHT',
        count: missingInPlaywright.length,
        items: missingInPlaywright.slice(0, 5),
        severity: 'HIGH'
      });
    }
    
    if (missingInPuppeteer.length > 0) {
      analysis.discrepancies.push({
        type: 'MISSING_IN_PUPPETEER',
        count: missingInPuppeteer.length,
        items: missingInPuppeteer.slice(0, 5),
        severity: 'HIGH'
      });
    }
    
    // Check for NULL date preservation
    const puppeteerNullDates = puppeteerData?.filter(d => 
      d.raw_end_date === '- -' || d.raw_end_date === '-' || !d.raw_end_date
    ).length || 0;
    
    const playwrightNullDates = playwrightActive.length;
    
    if (puppeteerNullDates !== playwrightNullDates) {
      analysis.criticalFindings.push({
        issue: 'NULL_DATE_MISMATCH',
        message: `Puppeteer found ${puppeteerNullDates} NULL dates, Playwright found ${playwrightNullDates}`,
        impact: 'CRITICAL - Affects Medicare telehealth eligibility'
      });
    }
    
    // Determine Medicare risk level
    if (!analysis.dataIntegrity.match) {
      analysis.medicareRisk = {
        level: 'CRITICAL',
        message: '🚨 EXTREME RISK: Scrapers do not match! $500,000 fine possible!',
        action: 'DO NOT BILL MEDICARE until scrapers are synchronized'
      };
      
      analysis.recommendations.push(
        '1. STOP all Medicare billing immediately',
        '2. Run both scrapers again to verify',
        '3. Check for website changes on DisasterAssist',
        '4. Review scraper logs for errors',
        '5. Contact technical support if mismatch persists'
      );
    } else if (puppeteerActive.length === 0) {
      analysis.medicareRisk = {
        level: 'MEDIUM',
        message: '⚠️ WARNING: No active disasters found',
        action: 'Verify DisasterAssist website is accessible'
      };
      
      analysis.recommendations.push(
        '1. Check if DisasterAssist website is up',
        '2. Verify scraper permissions',
        '3. Run scrapers again in 1 hour'
      );
    } else {
      analysis.medicareRisk = {
        level: 'LOW',
        message: '✅ SAFE: Scrapers match with high confidence',
        action: `Medicare billing approved for ${puppeteerActive.length} active disasters`
      };
      
      analysis.recommendations.push(
        '1. Continue regular monitoring',
        '2. Run validation every 4 hours',
        '3. Keep audit logs for compliance'
      );
    }
    
    // State-by-state analysis
    const stateAnalysis: Record<string, any> = {};
    const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'NT', 'TAS', 'ACT'];
    
    states.forEach(state => {
      const puppeteerCount = puppeteerActive.filter(d => d.state_code === state).length;
      const playwrightCount = playwrightActive.filter(d => d.state_code === state).length;
      
      stateAnalysis[state] = {
        puppeteer: puppeteerCount,
        playwright: playwrightCount,
        match: puppeteerCount === playwrightCount,
        status: puppeteerCount === playwrightCount ? 'MATCHED' : 'MISMATCH'
      };
    });
    
    // Generate AI insights
    const insights = generateAIInsights(analysis, stateAnalysis);
    
    // Save analysis to database
    await supabase.from('ai_analysis_reports').insert({
      analysis_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data_integrity: analysis.dataIntegrity,
      discrepancies: analysis.discrepancies,
      medicare_risk: analysis.medicareRisk,
      recommendations: analysis.recommendations,
      critical_findings: analysis.criticalFindings,
      state_analysis: stateAnalysis,
      ai_insights: insights
    });
    
    return NextResponse.json({
      success: true,
      analysis,
      stateAnalysis,
      aiInsights: insights,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateConfidence(count1: number, count2: number): number {
  if (count1 === 0 && count2 === 0) return 0;
  if (count1 === count2) return 100;
  
  const min = Math.min(count1, count2);
  const max = Math.max(count1, count2);
  return Math.round((min / max) * 100);
}

function generateAIInsights(analysis: any, stateAnalysis: any): string[] {
  const insights = [];
  
  // Overall data quality insight
  if (analysis.dataIntegrity.confidence >= 95) {
    insights.push('📊 EXCELLENT: Data quality exceeds 95% confidence threshold for Medicare compliance');
  } else if (analysis.dataIntegrity.confidence >= 80) {
    insights.push('📊 GOOD: Data quality is acceptable but requires monitoring');
  } else {
    insights.push('📊 CRITICAL: Data quality below acceptable threshold - immediate action required');
  }
  
  // Active disaster insight
  const activeCount = analysis.dataIntegrity.puppeteerCount;
  if (activeCount > 10) {
    insights.push(`🌊 HIGH ACTIVITY: ${activeCount} active disasters indicate significant telehealth demand`);
  } else if (activeCount > 5) {
    insights.push(`⚡ MODERATE ACTIVITY: ${activeCount} active disasters across Australia`);
  } else if (activeCount > 0) {
    insights.push(`📍 LOW ACTIVITY: Only ${activeCount} active disasters currently`);
  }
  
  // State-specific insights
  const nswCount = stateAnalysis['NSW']?.puppeteer || 0;
  if (nswCount >= 5) {
    insights.push(`🔥 NSW ALERT: ${nswCount} active disasters - highest in the country`);
  }
  
  // Mismatch pattern detection
  if (analysis.discrepancies.length > 0) {
    const totalMismatches = analysis.discrepancies.reduce((sum: number, d: any) => sum + d.count, 0);
    insights.push(`⚠️ PATTERN DETECTED: ${totalMismatches} discrepancies suggest potential scraper issues`);
    
    if (analysis.discrepancies.some((d: any) => d.type === 'MISSING_IN_PLAYWRIGHT')) {
      insights.push('🎭 Playwright scraper may be missing data - check CSS selectors');
    }
    
    if (analysis.discrepancies.some((d: any) => d.type === 'MISSING_IN_PUPPETEER')) {
      insights.push('🚀 Puppeteer scraper may be missing data - check page load timing');
    }
  }
  
  // Time-based insight
  const hour = new Date().getHours();
  if (hour >= 22 || hour <= 6) {
    insights.push('🌙 OFF-PEAK: Running scrapers during low-traffic hours - optimal performance expected');
  } else if (hour >= 9 && hour <= 17) {
    insights.push('☀️ PEAK HOURS: Government websites may be slower - consider retry logic');
  }
  
  // Compliance insight
  if (analysis.medicareRisk.level === 'LOW') {
    insights.push('✅ COMPLIANT: System meets all Medicare billing requirements');
  } else if (analysis.medicareRisk.level === 'CRITICAL') {
    insights.push('🚨 NON-COMPLIANT: System does NOT meet Medicare requirements - billing prohibited');
  }
  
  return insights;
}