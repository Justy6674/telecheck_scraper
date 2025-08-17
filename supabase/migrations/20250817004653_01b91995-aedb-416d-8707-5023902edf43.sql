-- Create secure storage buckets with proper RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('verification-snapshots', 'verification-snapshots', false, 52428800, ARRAY['application/json', 'text/plain']),
  ('compliance-certificates', 'compliance-certificates', false, 52428800, ARRAY['application/pdf', 'application/json'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for verification-snapshots bucket
CREATE POLICY "Users can view their own verification snapshots" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-snapshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "System can insert verification snapshots" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-snapshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for compliance-certificates bucket
CREATE POLICY "Users can view their own compliance certificates" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'compliance-certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "System can insert compliance certificates" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance-certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure postcode_verifications has proper RLS (missing from previous migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'postcode_verifications' AND policyname = 'Users can view own verifications') THEN
        CREATE POLICY "Users can view own verifications" ON public.postcode_verifications
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                AND user_type IN ('admin', 'super_admin')
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'postcode_verifications' AND policyname = 'System can insert verifications') THEN
        CREATE POLICY "System can insert verifications" ON public.postcode_verifications
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;