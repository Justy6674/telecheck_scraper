-- Create NEMA LGA profiles table for storing NEMA Word document metadata
CREATE TABLE public.nema_lga_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lga_code VARCHAR NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  document_size INTEGER,
  content_type VARCHAR,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nema_url TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}',
  attribution TEXT NOT NULL DEFAULT 'Data sourced from National Emergency Management Agency (NEMA) under Creative Commons Attribution 4.0 International license',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for disaster documents
INSERT INTO storage.buckets (id, name, public) VALUES ('disaster-documents', 'disaster-documents', false);

-- Create policies for NEMA profiles
CREATE POLICY "NEMA profiles are viewable by everyone" 
ON public.nema_lga_profiles 
FOR SELECT 
USING (true);

-- Create policies for storage access
CREATE POLICY "NEMA documents are downloadable by authenticated users" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'disaster-documents' AND auth.uid() IS NOT NULL);

-- Enable RLS
ALTER TABLE public.nema_lga_profiles ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nema_profiles_updated_at
BEFORE UPDATE ON public.nema_lga_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();