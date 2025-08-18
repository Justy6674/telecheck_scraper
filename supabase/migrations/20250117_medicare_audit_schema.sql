-- CRITICAL: Medicare Telehealth Eligibility Schema
-- This schema tracks disaster declarations for Medicare compliance
-- Maintains full audit trail for practitioner queries

-- Drop existing tables if needed (be careful in production!)
DROP TABLE IF EXISTS medicare_access_logs CASCADE;
DROP TABLE IF EXISTS disaster_history CASCADE;
DROP TABLE IF EXISTS disaster_lgas CASCADE;

-- Create disaster_lgas table for LGA tracking (CRITICAL for Medicare)
CREATE TABLE IF NOT EXISTS disaster_lgas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agrn_reference VARCHAR(50) NOT NULL,
  lga_code VARCHAR(10) NOT NULL,
  lga_name VARCHAR(255) NOT NULL,
  state_code VARCHAR(3) NOT NULL,
  added_date DATE NOT NULL,
  removed_date DATE,
  currently_affected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for each AGRN + LGA combination
  UNIQUE(agrn_reference, lga_name),
  
  -- Foreign key to main declarations table
  FOREIGN KEY (agrn_reference) REFERENCES disaster_declarations(agrn_reference) ON DELETE CASCADE
);

-- Create history table for audit trail
CREATE TABLE IF NOT EXISTS disaster_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agrn_reference VARCHAR(50) NOT NULL,
  change_date TIMESTAMPTZ DEFAULT NOW(),
  change_type VARCHAR(50) NOT NULL, -- 'created', 'lga_added', 'lga_removed', 'status_changed', 'end_date_added'
  field_name VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  change_details TEXT,
  synced_from_url TEXT,
  
  FOREIGN KEY (agrn_reference) REFERENCES disaster_declarations(agrn_reference) ON DELETE CASCADE
);

-- Create Medicare access logs for practitioner queries
CREATE TABLE IF NOT EXISTS medicare_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_number VARCHAR(20),
  provider_name VARCHAR(255),
  patient_postcode VARCHAR(4),
  patient_lga VARCHAR(255),
  agrn_checked VARCHAR(50),
  query_date TIMESTAMPTZ DEFAULT NOW(),
  was_eligible BOOLEAN,
  eligibility_reason TEXT,
  medicare_item_numbers TEXT[], -- Array of telehealth item numbers used
  claim_reference VARCHAR(100),
  audit_notes TEXT,
  
  -- Index for quick lookups
  INDEX idx_practitioner_date (practitioner_number, query_date),
  INDEX idx_patient_location (patient_postcode, patient_lga),
  INDEX idx_agrn_checked (agrn_checked)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_disaster_lgas_agrn ON disaster_lgas(agrn_reference);
CREATE INDEX IF NOT EXISTS idx_disaster_lgas_state ON disaster_lgas(state_code);
CREATE INDEX IF NOT EXISTS idx_disaster_lgas_affected ON disaster_lgas(currently_affected);
CREATE INDEX IF NOT EXISTS idx_disaster_lgas_dates ON disaster_lgas(added_date, removed_date);
CREATE INDEX IF NOT EXISTS idx_disaster_history_agrn ON disaster_history(agrn_reference);
CREATE INDEX IF NOT EXISTS idx_disaster_history_date ON disaster_history(change_date);

-- Create a view for current active disasters with LGAs
CREATE OR REPLACE VIEW active_disasters_with_lgas AS
SELECT 
  d.agrn_reference,
  d.event_name,
  d.disaster_type,
  d.declaration_date,
  d.expiry_date,
  d.declaration_status,
  d.state_code,
  d.description,
  d.last_sync_timestamp,
  COALESCE(
    json_agg(
      json_build_object(
        'lga_code', l.lga_code,
        'lga_name', l.lga_name,
        'added_date', l.added_date,
        'removed_date', l.removed_date
      ) ORDER BY l.lga_name
    ) FILTER (WHERE l.id IS NOT NULL),
    '[]'::json
  ) as affected_lgas,
  COUNT(l.id) as lga_count
FROM disaster_declarations d
LEFT JOIN disaster_lgas l ON d.agrn_reference = l.agrn_reference AND l.currently_affected = true
WHERE d.declaration_status = 'active'
GROUP BY d.agrn_reference;

-- Create a function to check Medicare eligibility
CREATE OR REPLACE FUNCTION check_medicare_eligibility(
  p_patient_postcode VARCHAR(4),
  p_patient_lga VARCHAR(255) DEFAULT NULL,
  p_practitioner_number VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
  eligible BOOLEAN,
  agrn_reference VARCHAR(50),
  event_name VARCHAR(500),
  disaster_type disaster_type,
  declaration_date DATE,
  expiry_date DATE,
  affected_lgas JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as eligible,
    d.agrn_reference,
    d.event_name,
    d.disaster_type,
    d.declaration_date,
    d.expiry_date,
    json_agg(
      json_build_object(
        'lga_name', l.lga_name,
        'added_date', l.added_date
      )
    ) as affected_lgas
  FROM disaster_declarations d
  JOIN disaster_lgas l ON d.agrn_reference = l.agrn_reference
  WHERE d.declaration_status = 'active'
    AND l.currently_affected = true
    AND (
      -- Check by LGA name if provided
      (p_patient_lga IS NOT NULL AND LOWER(l.lga_name) = LOWER(p_patient_lga))
      OR
      -- Check by postcode (would need postcode-to-LGA mapping in production)
      (p_patient_postcode IS NOT NULL AND EXISTS (
        SELECT 1 FROM postcode_lga_mapping plm 
        WHERE plm.postcode = p_patient_postcode 
        AND plm.lga_code = l.lga_code
      ))
    )
  GROUP BY d.agrn_reference, d.event_name, d.disaster_type, d.declaration_date, d.expiry_date;
  
  -- Log the access if practitioner number provided
  IF p_practitioner_number IS NOT NULL THEN
    INSERT INTO medicare_access_logs (
      practitioner_number,
      patient_postcode,
      patient_lga,
      agrn_checked,
      was_eligible,
      eligibility_reason
    )
    SELECT 
      p_practitioner_number,
      p_patient_postcode,
      p_patient_lga,
      d.agrn_reference,
      true,
      'Patient in declared disaster area'
    FROM disaster_declarations d
    JOIN disaster_lgas l ON d.agrn_reference = l.agrn_reference
    WHERE d.declaration_status = 'active'
      AND l.currently_affected = true
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to track changes
CREATE OR REPLACE FUNCTION track_disaster_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.declaration_status != NEW.declaration_status THEN
      INSERT INTO disaster_history (
        agrn_reference,
        change_type,
        field_name,
        old_value,
        new_value,
        change_details
      ) VALUES (
        NEW.agrn_reference,
        'status_changed',
        'declaration_status',
        to_jsonb(OLD.declaration_status),
        to_jsonb(NEW.declaration_status),
        format('Status changed from %s to %s', OLD.declaration_status, NEW.declaration_status)
      );
    END IF;
    
    -- Track end date changes
    IF OLD.expiry_date IS NULL AND NEW.expiry_date IS NOT NULL THEN
      INSERT INTO disaster_history (
        agrn_reference,
        change_type,
        field_name,
        old_value,
        new_value,
        change_details
      ) VALUES (
        NEW.agrn_reference,
        'end_date_added',
        'expiry_date',
        'null'::jsonb,
        to_jsonb(NEW.expiry_date),
        format('End date set to %s', NEW.expiry_date)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking changes
DROP TRIGGER IF EXISTS track_disaster_changes_trigger ON disaster_declarations;
CREATE TRIGGER track_disaster_changes_trigger
AFTER UPDATE ON disaster_declarations
FOR EACH ROW
EXECUTE FUNCTION track_disaster_changes();

-- Create RLS policies
ALTER TABLE disaster_lgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicare_access_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for disaster data
CREATE POLICY "Public can view disaster LGAs" ON disaster_lgas
  FOR SELECT USING (true);

CREATE POLICY "Public can view disaster history" ON disaster_history
  FOR SELECT USING (true);

-- Restricted access for Medicare logs (only service role)
CREATE POLICY "Only service role can access Medicare logs" ON medicare_access_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT SELECT ON disaster_lgas TO anon, authenticated;
GRANT SELECT ON disaster_history TO anon, authenticated;
GRANT SELECT ON active_disasters_with_lgas TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_medicare_eligibility TO anon, authenticated;

-- Sample data for testing (remove in production)
INSERT INTO disaster_lgas (agrn_reference, lga_code, lga_name, state_code, added_date)
VALUES 
  ('AGRN-1216', '10050', 'Armidale', 'NSW', '2025-07-31'),
  ('AGRN-1216', '12350', 'Dungog', 'NSW', '2025-07-31'),
  ('AGRN-1216', '14000', 'Gunnedah', 'NSW', '2025-07-31')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE disaster_lgas IS 'Tracks which LGAs are affected by each disaster - CRITICAL for Medicare telehealth eligibility';
COMMENT ON TABLE disaster_history IS 'Full audit trail of all changes to disaster declarations';
COMMENT ON TABLE medicare_access_logs IS 'Logs all practitioner queries for Medicare compliance and audit purposes';
COMMENT ON FUNCTION check_medicare_eligibility IS 'Checks if a patient location is eligible for Medicare telehealth due to disaster declaration';