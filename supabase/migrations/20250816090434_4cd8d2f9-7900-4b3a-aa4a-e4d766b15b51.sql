-- Enhanced audit trail tables for bulletproof compliance

-- Audit snapshots table for WORM storage references
CREATE TABLE public.audit_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL,
  source_type TEXT NOT NULL, -- 'disaster_assist', 'state_ses', 'bom_warnings'
  source_url TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL, -- SHA-256 for integrity
  storage_path TEXT, -- Reference to stored file
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Source validations for multi-source cross-checking
CREATE TABLE public.source_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL,
  primary_source JSONB NOT NULL,
  secondary_sources JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  conflict_resolution JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Practitioner credentials for AHPRA tracking
CREATE TABLE public.practitioner_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ahpra_number TEXT,
  provider_name TEXT NOT NULL,
  provider_type provider_type_enum NOT NULL,
  practice_name TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Compliance certificates for legal documentation
CREATE TABLE public.compliance_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL,
  certificate_type TEXT NOT NULL DEFAULT 'mbs_compliance',
  certificate_data JSONB NOT NULL,
  digital_signature TEXT,
  certificate_hash TEXT NOT NULL,
  storage_path TEXT, -- PDF storage reference
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit metadata for comprehensive tracking
CREATE TABLE public.audit_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL,
  rfc3161_timestamp TEXT, -- Cryptographic timestamp
  blockchain_hash TEXT,
  system_version TEXT NOT NULL DEFAULT '1.0',
  audit_trail_complete BOOLEAN NOT NULL DEFAULT false,
  retention_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 years'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policies for user access
CREATE POLICY "Users can view their own audit snapshots" 
ON public.audit_snapshots 
FOR SELECT 
USING (
  verification_id IN (
    SELECT id FROM public.verification_logs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own source validations" 
ON public.source_validations 
FOR SELECT 
USING (
  verification_id IN (
    SELECT id FROM public.verification_logs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own practitioner credentials" 
ON public.practitioner_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practitioner credentials" 
ON public.practitioner_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practitioner credentials" 
ON public.practitioner_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own compliance certificates" 
ON public.compliance_certificates 
FOR SELECT 
USING (
  verification_id IN (
    SELECT id FROM public.verification_logs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own audit metadata" 
ON public.audit_metadata 
FOR SELECT 
USING (
  verification_id IN (
    SELECT id FROM public.verification_logs WHERE user_id = auth.uid()
  )
);

-- Create storage buckets for WORM data
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('verification-snapshots', 'verification-snapshots', false),
  ('compliance-certificates', 'compliance-certificates', false),
  ('audit-evidence', 'audit-evidence', false);

-- Storage policies for audit data
CREATE POLICY "Users can view their own verification snapshots" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'verification-snapshots' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "System can insert verification snapshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'verification-snapshots');

CREATE POLICY "Users can view their own compliance certificates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'compliance-certificates' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "System can insert compliance certificates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'compliance-certificates');

CREATE POLICY "Users can view their own audit evidence" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'audit-evidence' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "System can insert audit evidence" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audit-evidence');

-- Add triggers for timestamp updates
CREATE TRIGGER update_practitioner_credentials_updated_at
BEFORE UPDATE ON public.practitioner_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();