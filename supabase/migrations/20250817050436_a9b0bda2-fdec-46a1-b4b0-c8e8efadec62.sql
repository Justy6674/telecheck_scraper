-- Fix security issues for the new table
-- The nema_lga_profiles table already has RLS enabled from previous migration

-- Update the storage bucket to be public for document access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'disaster-documents';

-- Create improved storage policy
DROP POLICY IF EXISTS "NEMA documents are downloadable by authenticated users" ON storage.objects;

CREATE POLICY "NEMA documents are publicly readable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'disaster-documents');

-- Allow authenticated users to upload to the bucket (for the edge function)
CREATE POLICY "Authenticated users can upload disaster documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'disaster-documents' AND auth.uid() IS NOT NULL);