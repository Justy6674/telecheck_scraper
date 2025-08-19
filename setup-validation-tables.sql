-- TELECHECK VALIDATION SYSTEM TABLES
-- Critical for Medicare compliance - $500,000 fine risk

-- Separate table for Playwright validation scraper
CREATE TABLE IF NOT EXISTS disaster_declarations_validation (
  id SERIAL PRIMARY KEY,
  agrn VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type VARCHAR(50),
  state_code VARCHAR(10),
  start_date DATE,
  end_date DATE, -- NULL means ACTIVE disaster eligible for telehealth
  affected_lgas TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scraper_source VARCHAR(20) DEFAULT 'playwright'
);

-- Validation runs tracking
CREATE TABLE IF NOT EXISTS validation_runs (
  id SERIAL PRIMARY KEY,
  run_id UUID UNIQUE NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  is_valid BOOLEAN NOT NULL,
  puppeteer_count INTEGER,
  playwright_count INTEGER,
  active_disasters_puppeteer INTEGER,
  active_disasters_playwright INTEGER,
  critical_errors JSONB,
  mismatches JSONB,
  puppeteer_time_ms INTEGER,
  playwright_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Critical alerts for Medicare compliance
CREATE TABLE IF NOT EXISTS critical_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  details JSONB,
  timestamp TIMESTAMP NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System metrics for monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  value NUMERIC,
  timestamp TIMESTAMP NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_runs_timestamp ON validation_runs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_validation_runs_is_valid ON validation_runs(is_valid);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_severity ON critical_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_acknowledged ON critical_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_disaster_declarations_validation_end_date ON disaster_declarations_validation(end_date);
CREATE INDEX IF NOT EXISTS idx_disaster_declarations_validation_agrn ON disaster_declarations_validation(agrn);

-- RLS policies for validation table
ALTER TABLE disaster_declarations_validation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to validation disasters"
  ON disaster_declarations_validation FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert validation disasters"
  ON disaster_declarations_validation FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update validation disasters"
  ON disaster_declarations_validation FOR UPDATE
  TO service_role
  USING (true);

-- RLS for validation runs
ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read validation runs"
  ON validation_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to validation runs"
  ON validation_runs FOR ALL
  TO service_role
  USING (true);

-- RLS for critical alerts
ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read alerts"
  ON critical_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to alerts"
  ON critical_alerts FOR ALL
  TO service_role
  USING (true);

-- RLS for system metrics
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to metrics"
  ON system_metrics FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert metrics"
  ON system_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);