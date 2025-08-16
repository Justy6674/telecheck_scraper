-- Fix RLS security issues for existing public schema tables

-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_source_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mbs_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postcode_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Create missing policies for public read access where appropriate
CREATE POLICY "Public read access to disaster types" ON public.disaster_types
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Public read access to disasters" ON public.disasters
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Public read access to disaster zones" ON public.disaster_zones
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Public read access to compliance templates" ON public.compliance_templates
FOR SELECT TO authenticated, anon
USING (true);

-- Restrict access to sensitive data sources information
CREATE POLICY "Admin access to data sources" ON public.data_sources
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Admin access to data source health" ON public.data_source_health
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Admin access to system metrics" ON public.system_metrics
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type IN ('admin', 'super_admin')
    )
);

-- Ensure MBS certificates are only viewable by the practitioner
CREATE POLICY "Practitioners can view own MBS certificates" ON public.mbs_certificates
FOR SELECT TO authenticated
USING (practitioner_id = auth.uid());

-- Ensure postcode verifications are only viewable by owner or admin
CREATE POLICY "Users can view own postcode verifications" ON public.postcode_verifications
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type IN ('admin', 'super_admin')
    )
);

-- Grant appropriate permissions
GRANT SELECT ON public.disaster_types TO authenticated, anon;
GRANT SELECT ON public.disasters TO authenticated, anon;
GRANT SELECT ON public.disaster_zones TO authenticated, anon;
GRANT SELECT ON public.compliance_templates TO authenticated, anon;