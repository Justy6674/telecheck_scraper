-- Fix critical RLS security issues - enable RLS on all public tables
-- This addresses the security linter errors

-- Enable RLS on storage.objects (critical for security)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on all public tables that need it
ALTER TABLE public.disaster_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postcode_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lga_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mbs_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_source_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_validations ENABLE ROW LEVEL SECURITY;