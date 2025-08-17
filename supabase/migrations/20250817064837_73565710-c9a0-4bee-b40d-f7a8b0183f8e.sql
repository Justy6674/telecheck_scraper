-- Add missing columns for enhanced Disaster Assist integration
ALTER TABLE disaster_declarations 
ADD COLUMN IF NOT EXISTS event_name TEXT,
ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT now();

-- Update existing records to have proper sync timestamp
UPDATE disaster_declarations 
SET last_sync_timestamp = updated_at 
WHERE last_sync_timestamp IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_disaster_declarations_lga_status ON disaster_declarations(lga_code, declaration_status);
CREATE INDEX IF NOT EXISTS idx_disaster_declarations_agrn ON disaster_declarations(agrn_reference);
CREATE INDEX IF NOT EXISTS idx_disaster_declarations_dates ON disaster_declarations(declaration_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_disaster_declarations_sync ON disaster_declarations(last_sync_timestamp);

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily DisasterAssist sync at 3AM
SELECT cron.schedule(
  'crawl-disasterassist',
  '0 3 * * *', -- 3am daily
  $$
  SELECT net.http_post(
    url := 'https://sfbohkqmykagkdmggcxw.supabase.co/functions/v1/disasterassist-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"automated": true}'::jsonb
  ) as request_id;
  $$
);