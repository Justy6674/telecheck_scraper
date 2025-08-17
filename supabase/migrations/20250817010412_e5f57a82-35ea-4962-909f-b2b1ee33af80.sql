-- Address the spatial_ref_sys RLS issue for PostGIS
-- Since we cannot enable RLS on this Supabase-managed table, 
-- we need to ensure it's not accessible through PostgREST

-- First, let's explicitly revoke any potential access to spatial_ref_sys
-- This ensures it's not exposed through the API even though it's in public schema
REVOKE ALL ON public.spatial_ref_sys FROM anon, authenticated, authenticator;

-- Grant only the minimum required access for PostGIS functionality
-- Only allow the postgis extension and internal functions to access it
GRANT SELECT ON public.spatial_ref_sys TO postgres;

-- Add a comment to document why this table cannot have RLS
COMMENT ON TABLE public.spatial_ref_sys IS 
'PostGIS system table managed by Supabase. Cannot enable RLS due to system constraints. Access restricted via REVOKE statements for API security.';

-- Create a security note for documentation
INSERT INTO system_metrics (metric_name, metric_value, metric_unit, tags, timestamp)
VALUES (
  'security_compliance',
  1,
  'boolean',
  '{"table": "spatial_ref_sys", "status": "secured_via_revoke", "reason": "postgis_system_table", "compliance": "api_access_blocked"}'::jsonb,
  now()
)
ON CONFLICT DO NOTHING;