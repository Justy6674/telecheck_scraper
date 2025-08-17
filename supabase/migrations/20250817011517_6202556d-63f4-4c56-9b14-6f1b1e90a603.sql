-- Fix security issues: Enable RLS on staging tables
ALTER TABLE public.postcode_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lga_import_staging ENABLE ROW LEVEL SECURITY;

-- Admin-only access to staging tables
CREATE POLICY "Admin access to postcode staging" ON public.postcode_import_staging
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin access to lga staging" ON public.lga_import_staging
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'super_admin')
    )
  );