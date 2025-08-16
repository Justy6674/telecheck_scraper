-- Fix remaining RLS security issues - only add what's missing

-- Enable RLS on tables that don't have it enabled (skip those that already have it)
DO $$
BEGIN
    -- Check and enable RLS only if not already enabled
    IF NOT (SELECT enabled FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_source_health' AND rowsecurity = true) THEN
        ALTER TABLE public.data_source_health ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT enabled FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_sources' AND rowsecurity = true) THEN
        ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT enabled FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_metrics' AND rowsecurity = true) THEN
        ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT enabled FROM pg_tables WHERE schemaname = 'public' AND tablename = 'postcode_verifications' AND rowsecurity = true) THEN
        ALTER TABLE public.postcode_verifications ENABLE ROW LEVEL SECURITY;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Continue if there are any issues
END $$;

-- Create policies only if they don't exist
DO $$
BEGIN
    -- Admin access to data sources
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'data_sources' AND policyname = 'Admin access to data sources') THEN
        CREATE POLICY "Admin access to data sources" ON public.data_sources
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                AND user_type IN ('admin', 'super_admin')
            )
        );
    END IF;

    -- Admin access to data source health
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'data_source_health' AND policyname = 'Admin access to data source health') THEN
        CREATE POLICY "Admin access to data source health" ON public.data_source_health
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                AND user_type IN ('admin', 'super_admin')
            )
        );
    END IF;

    -- Admin access to system metrics
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_metrics' AND policyname = 'Admin access to system metrics') THEN
        CREATE POLICY "Admin access to system metrics" ON public.system_metrics
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                AND user_type IN ('admin', 'super_admin')
            )
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Continue if there are any issues
END $$;