-- Disaster Index Table (for quick scans without clicking into details)
CREATE TABLE IF NOT EXISTS disaster_index (
  agrn TEXT PRIMARY KEY,
  disaster_name TEXT NOT NULL,
  start_date_raw TEXT,
  end_date_raw TEXT,
  state TEXT,
  disaster_type TEXT,
  url TEXT,
  is_active BOOLEAN DEFAULT false,
  telehealth_eligible BOOLEAN DEFAULT false,
  scan_id UUID,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_agrn UNIQUE (agrn)
);

-- Index Scans Metadata (tracks each quick scan)
CREATE TABLE IF NOT EXISTS index_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT DEFAULT 'quick_index',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds NUMERIC,
  total_disasters INTEGER,
  active_disasters INTEGER,
  expired_disasters INTEGER,
  changes_detected BOOLEAN DEFAULT false,
  state_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Frontend Estimates (for immediate display)
CREATE TABLE IF NOT EXISTS frontend_estimates (
  id TEXT PRIMARY KEY DEFAULT 'current',
  total_disasters INTEGER,
  active_disasters INTEGER,
  state_counts JSONB,
  last_updated TIMESTAMPTZ,
  scan_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraper Comparison Reports (for validation)
CREATE TABLE IF NOT EXISTS scraper_comparison_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  puppeteer_count INTEGER,
  playwright_count INTEGER,
  disasters_compared INTEGER,
  discrepancies JSONB,
  confidence_score NUMERIC,
  passed BOOLEAN,
  recommendation TEXT,
  report_path TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_disaster_index_is_active ON disaster_index(is_active);
CREATE INDEX IF NOT EXISTS idx_disaster_index_state ON disaster_index(state);
CREATE INDEX IF NOT EXISTS idx_disaster_index_scan_id ON disaster_index(scan_id);
CREATE INDEX IF NOT EXISTS idx_index_scans_changes ON index_scans(changes_detected);

-- Add comment for clarity
COMMENT ON TABLE disaster_index IS 'Quick index of all disasters from table view - used for 3x weekly change detection';
COMMENT ON TABLE frontend_estimates IS 'Pre-calculated counts for immediate front-page display';
COMMENT ON TABLE index_scans IS 'Metadata about each quick index scan for change tracking';