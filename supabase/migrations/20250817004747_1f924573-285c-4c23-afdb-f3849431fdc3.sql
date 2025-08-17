-- Fix storage bucket policies - drop existing and recreate with correct structure
DO $$
BEGIN
    -- Drop existing policies that conflict
    DROP POLICY IF EXISTS "Users can view their own verification snapshots" ON storage.objects;
    DROP POLICY IF EXISTS "System can insert verification snapshots" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own compliance certificates" ON storage.objects;
    DROP POLICY IF EXISTS "System can insert compliance certificates" ON storage.objects;
    
    -- Create storage buckets if they don't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES 
      ('verification-snapshots', 'verification-snapshots', false, 52428800, ARRAY['application/json', 'text/plain']),
      ('compliance-certificates', 'compliance-certificates', false, 52428800, ARRAY['application/pdf', 'application/json'])
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    -- Create secure RLS policies for verification-snapshots bucket
    CREATE POLICY "Secure verification snapshots access" ON storage.objects
    FOR ALL TO authenticated
    USING (
      bucket_id = 'verification-snapshots' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'verification-snapshots'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

    -- Create secure RLS policies for compliance-certificates bucket
    CREATE POLICY "Secure compliance certificates access" ON storage.objects
    FOR ALL TO authenticated
    USING (
      bucket_id = 'compliance-certificates'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'compliance-certificates'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error but continue
        RAISE NOTICE 'Error creating storage policies: %', SQLERRM;
END $$;