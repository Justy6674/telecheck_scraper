-- Enable RLS on tables that don't have it enabled
ALTER TABLE IF EXISTS active_disasters_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disaster_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS frontend_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS geography_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS geometry_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS index_scans ENABLE ROW LEVEL SECURITY;

-- Add basic policies for the tables that need them
CREATE POLICY "Public read access for active disasters summary" 
ON active_disasters_summary FOR SELECT USING (true);

CREATE POLICY "Public read access for disaster index" 
ON disaster_index FOR SELECT USING (true);

CREATE POLICY "Public read access for frontend estimates" 
ON frontend_estimates FOR SELECT USING (true);

CREATE POLICY "Service role only for index scans" 
ON index_scans FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Geography and geometry columns are system tables - policies for service role only
CREATE POLICY "Service role only for geography columns" 
ON geography_columns FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role only for geometry columns" 
ON geometry_columns FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');