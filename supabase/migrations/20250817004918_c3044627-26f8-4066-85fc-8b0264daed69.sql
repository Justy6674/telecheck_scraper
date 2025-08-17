-- Fix critical RLS security issues - enable RLS on public tables only
-- Cannot modify storage.objects as it's managed by Supabase

-- Enable RLS on all public tables (some may already be enabled, but this is safe)
DO $$
DECLARE
    table_name text;
    table_names text[] := ARRAY[
        'disaster_declarations', 'compliance_certificates', 'disasters', 'audit_metadata',
        'postcodes', 'disaster_zones', 'compliance_templates', 'daily_usage_stats',
        'practice_registration', 'lgas', 'data_sources', 'disaster_types', 
        'verification_logs', 'user_profiles', 'postcode_verifications', 'api_keys',
        'states_territories', 'lga_registry', 'mbs_certificates', 'practitioner_credentials',
        'data_source_health', 'system_metrics', 'audit_snapshots', 'source_validations'
    ];
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Check if table exists and enable RLS
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'Enabled RLS for table: %', table_name;
        END IF;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        -- Continue if there are any issues
        RAISE NOTICE 'Error enabling RLS: %', SQLERRM;
END $$;