-- Fix RLS security issues from linter

-- Enable RLS on any missing tables (linter detected RLS disabled)
-- Check if lga_registry needs RLS
ALTER TABLE public.lga_registry ENABLE ROW LEVEL SECURITY;

-- Create policy for lga_registry (read-only public data)
CREATE POLICY "LGA registry is viewable by everyone" 
ON public.lga_registry 
FOR SELECT 
USING (true);

-- Add missing insert policies for audit tables
CREATE POLICY "System can insert audit snapshots" 
ON public.audit_snapshots 
FOR INSERT 
WITH CHECK (true); -- Allow system insertions

CREATE POLICY "System can insert source validations" 
ON public.source_validations 
FOR INSERT 
WITH CHECK (true); -- Allow system insertions

CREATE POLICY "System can insert compliance certificates" 
ON public.compliance_certificates 
FOR INSERT 
WITH CHECK (true); -- Allow system insertions

CREATE POLICY "System can insert audit metadata" 
ON public.audit_metadata 
FOR INSERT 
WITH CHECK (true); -- Allow system insertions