-- Enable RLS on spatial_ref_sys table and create public read policy
-- This table is a PostGIS system table that contains spatial reference system information
-- It should be readable by everyone as it contains public geodetic reference data

-- Enable Row Level Security on spatial_ref_sys
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
-- This is safe because spatial_ref_sys contains public geodetic reference information
CREATE POLICY "spatial_ref_sys_public_read" 
ON public.spatial_ref_sys 
FOR SELECT 
TO public 
USING (true);

-- Add comment explaining the security decision
COMMENT ON POLICY "spatial_ref_sys_public_read" ON public.spatial_ref_sys IS 
'Public read access is safe for spatial_ref_sys as it contains standard geodetic reference data that should be accessible to all users for spatial calculations';