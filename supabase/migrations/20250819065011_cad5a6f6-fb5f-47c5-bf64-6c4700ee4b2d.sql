-- Enable RLS only on actual tables (not views)
ALTER TABLE IF EXISTS disaster_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS frontend_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS index_scans ENABLE ROW LEVEL SECURITY;

-- Add basic policies for the tables that need them
CREATE POLICY "Public read access for disaster index" 
ON disaster_index FOR SELECT USING (true);

CREATE POLICY "Public read access for frontend estimates" 
ON frontend_estimates FOR SELECT USING (true);

CREATE POLICY "Service role only for index scans" 
ON index_scans FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');