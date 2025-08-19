import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Validate API key and get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Check subscription status
    if (org.subscription_status !== 'active' && org.subscription_status !== 'trialing') {
      return NextResponse.json(
        { error: 'Subscription inactive' },
        { status: 403 }
      );
    }

    // Check verification limit
    if (org.verifications_used >= org.verifications_limit) {
      return NextResponse.json(
        { 
          error: 'Verification limit exceeded',
          limit: org.verifications_limit,
          used: org.verifications_used
        },
        { status: 429 }
      );
    }

    // Check domain whitelist if configured
    const origin = req.headers.get('origin');
    if (org.allowed_domains && org.allowed_domains.length > 0) {
      if (!origin || !org.allowed_domains.some(domain => origin.includes(domain))) {
        return NextResponse.json(
          { error: 'Domain not allowed' },
          { status: 403 }
        );
      }
    }

    // Rate limiting (100 requests per minute)
    const now = Date.now();
    const rateLimitKey = apiKey;
    const rateLimit = rateLimitMap.get(rateLimitKey);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= 100) {
          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          );
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + 60000 });
      }
    } else {
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + 60000 });
    }

    // Get request data
    const { postcode, medicare_number } = await req.json();

    if (!postcode) {
      return NextResponse.json(
        { error: 'Postcode required' },
        { status: 400 }
      );
    }

    // Hash Medicare number if provided (for audit trail only)
    const medicareHash = medicare_number 
      ? crypto.createHash('sha256').update(medicare_number).digest('hex')
      : null;

    // Check if postcode has active disasters
    const { data: disasters, error: disasterError } = await supabase
      .from('disaster_declarations')
      .select('*')
      .contains('affected_lgas', [postcode])
      .is('end_date', null);

    if (disasterError) {
      throw disasterError;
    }

    const isEligible = disasters && disasters.length > 0;

    // Log the verification
    const { error: logError } = await supabase
      .from('verification_logs')
      .insert({
        organization_id: org.id,
        postcode,
        medicare_number_hash: medicareHash,
        is_eligible: isEligible,
        disaster_count: disasters?.length || 0,
        api_key_used: apiKey,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
      });

    if (logError) {
      console.error('Failed to log verification:', logError);
    }

    // Update verification count
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ 
        verifications_used: org.verifications_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', org.id);

    if (updateError) {
      console.error('Failed to update verification count:', updateError);
    }

    // Log API usage
    const responseTime = Date.now() - startTime;
    await supabase
      .from('api_usage')
      .insert({
        api_key: apiKey,
        organization_id: org.id,
        endpoint: '/api/public/verify',
        method: 'POST',
        status_code: 200,
        response_time_ms: responseTime,
      });

    // Return verification result
    return NextResponse.json({
      eligible: isEligible,
      postcode,
      disaster_count: disasters?.length || 0,
      disasters: disasters?.map(d => ({
        name: d.name,
        type: d.type,
        state: d.state_code,
        start_date: d.start_date,
      })) || [],
      verification_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Verification error:', error);
    
    // Log failed API call
    const responseTime = Date.now() - startTime;
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      await supabase
        .from('api_usage')
        .insert({
          api_key: apiKey,
          endpoint: '/api/public/verify',
          method: 'POST',
          status_code: 500,
          response_time_ms: responseTime,
        });
    }

    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// OPTIONS request for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}