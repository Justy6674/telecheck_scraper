-- Create data import infrastructure for comprehensive Australian data
-- This will enable loading all 3,333 postcodes, 537 LGAs, and real-time disaster data

-- Create data import tracking table
CREATE TABLE IF NOT EXISTS public.data_import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_type varchar(50) NOT NULL,
  source_url text,
  records_imported integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  import_status varchar(20) DEFAULT 'pending',
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on import logs
ALTER TABLE public.data_import_logs ENABLE ROW LEVEL SECURITY;

-- Admin access to import logs
CREATE POLICY "Admin access to import logs" ON public.data_import_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'super_admin')
    )
  );

-- Create federal data sources configuration
INSERT INTO data_sources (name, source_type, url, state_territory_id, update_frequency_minutes, reliability_score, is_active, auth_type)
VALUES 
  ('DisasterAssist.gov.au', 'federal_api', 'https://www.disasterassist.gov.au/api/disasters', NULL, 60, 95.0, true, 'none'),
  ('Bureau of Meteorology', 'federal_api', 'http://www.bom.gov.au/fwo/IDZ00001/IDZ00001.xml', NULL, 30, 98.0, true, 'none'),
  ('Geoscience Australia', 'federal_feed', 'https://earthquakes.ga.gov.au/api/earthquake', NULL, 15, 90.0, true, 'none')
ON CONFLICT (name) DO UPDATE SET
  url = EXCLUDED.url,
  update_frequency_minutes = EXCLUDED.update_frequency_minutes,
  reliability_score = EXCLUDED.reliability_score,
  is_active = EXCLUDED.is_active;

-- Create state-specific data sources
WITH state_sources AS (
  SELECT 
    st.id as state_id,
    st.code,
    st.name,
    source_data.source_name,
    source_data.source_url,
    source_data.update_freq
  FROM states_territories st
  CROSS JOIN (VALUES
    ('NSW Emergency Management', 'https://www.nsw.gov.au/disaster-recovery/natural-disaster-declarations', 120),
    ('QLD Recovery Authority', 'https://www.qra.qld.gov.au/disaster-funding', 90),
    ('VIC Emergency Management', 'https://www.emergency.vic.gov.au/prepare/', 90),
    ('WA Emergency Services', 'https://www.emergency.wa.gov.au/', 90),
    ('SA Emergency Services', 'https://www.ses.sa.gov.au/', 90),
    ('TAS Emergency Services', 'https://www.ses.tas.gov.au/', 90),
    ('ACT Emergency Services', 'https://esa.act.gov.au/', 90),
    ('NT Emergency Services', 'https://pfes.nt.gov.au/', 90)
  ) AS source_data(source_name, source_url, update_freq)
  WHERE (st.code = 'NSW' AND source_data.source_name LIKE 'NSW%')
     OR (st.code = 'QLD' AND source_data.source_name LIKE 'QLD%')
     OR (st.code = 'VIC' AND source_data.source_name LIKE 'VIC%')
     OR (st.code = 'WA' AND source_data.source_name LIKE 'WA%')
     OR (st.code = 'SA' AND source_data.source_name LIKE 'SA%')
     OR (st.code = 'TAS' AND source_data.source_name LIKE 'TAS%')
     OR (st.code = 'ACT' AND source_data.source_name LIKE 'ACT%')
     OR (st.code = 'NT' AND source_data.source_name LIKE 'NT%')
)
INSERT INTO data_sources (name, source_type, url, state_territory_id, update_frequency_minutes, reliability_score, is_active, auth_type)
SELECT 
  source_name,
  'state_portal',
  source_url,
  state_id,
  update_freq,
  85.0,
  true,
  'none'
FROM state_sources
ON CONFLICT (name) DO UPDATE SET
  url = EXCLUDED.url,
  state_territory_id = EXCLUDED.state_territory_id,
  update_frequency_minutes = EXCLUDED.update_frequency_minutes;

-- Create bulk postcode import template (ready for CSV import)
CREATE TABLE IF NOT EXISTS public.postcode_import_staging (
  postcode varchar(4) NOT NULL,
  suburb varchar(100),
  state_code varchar(3),
  latitude numeric(10,7),
  longitude numeric(10,7),
  lga_name varchar(200),
  delivery_office varchar(100),
  import_batch_id uuid DEFAULT gen_random_uuid()
);

-- Create bulk LGA import template
CREATE TABLE IF NOT EXISTS public.lga_import_staging (
  lga_code varchar(10) NOT NULL,
  lga_name varchar(200) NOT NULL,
  state_code varchar(3) NOT NULL,
  area_sqkm numeric(10,2),
  population integer,
  import_batch_id uuid DEFAULT gen_random_uuid()
);

-- Add system metrics for data completeness tracking
INSERT INTO system_metrics (metric_name, metric_value, metric_unit, tags, timestamp)
VALUES 
  ('data_completeness_postcodes', 0.03, 'percentage', '{"total_expected": 3333, "current_loaded": 1, "critical": true}'::jsonb, now()),
  ('data_completeness_lgas', 0.19, 'percentage', '{"total_expected": 537, "current_loaded": 1, "critical": true}'::jsonb, now()),
  ('data_freshness_disasters', 0, 'hours_since_update', '{"last_update": null, "critical": true}'::jsonb, now())
ON CONFLICT DO NOTHING;