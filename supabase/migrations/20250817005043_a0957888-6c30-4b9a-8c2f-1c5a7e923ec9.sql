-- Fix the last table without RLS and create a comprehensive view
-- spatial_ref_sys is a PostGIS system table but should have RLS for security

-- Enable RLS on spatial_ref_sys (PostGIS system table)
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a view to provide public read access to spatial reference systems
-- This is needed for GIS functionality but should be controlled
CREATE POLICY "Public read access to spatial reference systems" ON public.spatial_ref_sys
FOR SELECT TO authenticated, anon
USING (true);

-- Note: spatial_ref_sys is a PostGIS system table that contains coordinate system definitions
-- It's generally safe to allow read access but we enable RLS for compliance