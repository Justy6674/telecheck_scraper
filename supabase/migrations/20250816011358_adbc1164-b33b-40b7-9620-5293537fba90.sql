-- Create enums for disaster types and statuses
CREATE TYPE disaster_type_enum AS ENUM (
  'bushfire',
  'flood',
  'cyclone',
  'earthquake',
  'severe_storm',
  'drought',
  'heatwave',
  'landslide',
  'tsunami',
  'other'
);

CREATE TYPE declaration_status_enum AS ENUM (
  'active',
  'expired',
  'revoked',
  'superseded'
);

CREATE TYPE provider_type_enum AS ENUM (
  'GP',
  'NP',
  'Mixed'
);

CREATE TYPE subscription_plan_enum AS ENUM (
  'starter',
  'np_specialist',
  'professional',
  'enterprise',
  'corporate'
);

-- Create LGA registry table for Australian LGA codes
CREATE TABLE lga_registry (
  lga_code VARCHAR(10) PRIMARY KEY,
  lga_name TEXT NOT NULL,
  state_code CHAR(3) NOT NULL,
  state_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disaster declarations table
CREATE TABLE disaster_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lga_code VARCHAR(10) NOT NULL REFERENCES lga_registry(lga_code),
  disaster_type disaster_type_enum NOT NULL,
  declaration_date TIMESTAMPTZ NOT NULL,
  declaration_status declaration_status_enum NOT NULL DEFAULT 'active',
  state_code CHAR(3) NOT NULL,
  affected_areas JSONB,
  severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5),
  declaration_authority VARCHAR(100) NOT NULL,
  expiry_date TIMESTAMPTZ,
  source_url TEXT,
  description TEXT,
  postcodes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_system VARCHAR(50) NOT NULL,
  last_sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create practice registration table
CREATE TABLE practice_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_name TEXT NOT NULL,
  abn TEXT,
  email TEXT UNIQUE NOT NULL,
  subscription_plan subscription_plan_enum NOT NULL DEFAULT 'starter',
  provider_types provider_type_enum[] NOT NULL DEFAULT ARRAY['GP']::provider_type_enum[],
  contact_phone TEXT,
  address TEXT,
  state_code CHAR(3),
  postcode VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id)
);

-- Create verification logs table
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID REFERENCES practice_registration(id),
  patient_postcode VARCHAR(10) NOT NULL,
  provider_type provider_type_enum NOT NULL,
  verification_result BOOLEAN NOT NULL,
  compliance_note TEXT,
  disaster_declarations JSONB,
  exemption_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  declaration_ids UUID[],
  user_id UUID REFERENCES auth.users(id)
);

-- Create compliance templates table for MBS notes
CREATE TABLE compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  provider_type provider_type_enum NOT NULL,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_disaster_lga_status_date 
ON disaster_declarations (lga_code, declaration_status, declaration_date DESC);

CREATE INDEX idx_disaster_active_only 
ON disaster_declarations (declaration_date DESC) 
WHERE declaration_status = 'active';

CREATE INDEX idx_disaster_postcodes 
ON disaster_declarations USING GIN(postcodes);

CREATE INDEX idx_practice_user_id 
ON practice_registration (user_id);

CREATE INDEX idx_verification_practice_date 
ON verification_logs (practice_id, created_at DESC);

-- Enable RLS on all tables
ALTER TABLE disaster_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disaster_declarations (public read access)
CREATE POLICY "Disaster declarations are viewable by everyone" 
ON disaster_declarations FOR SELECT USING (true);

-- RLS Policies for practice_registration (user can only see their own practice)
CREATE POLICY "Users can view their own practice" 
ON practice_registration FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice" 
ON practice_registration FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice" 
ON practice_registration FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for verification_logs (user can only see their own logs)
CREATE POLICY "Users can view their own verification logs" 
ON verification_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification logs" 
ON verification_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for compliance_templates (public read access)
CREATE POLICY "Compliance templates are viewable by everyone" 
ON compliance_templates FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_disaster_declarations_updated_at
  BEFORE UPDATE ON disaster_declarations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_registration_updated_at
  BEFORE UPDATE ON practice_registration
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample LGA data
INSERT INTO lga_registry (lga_code, lga_name, state_code, state_name) VALUES
('10050', 'Adelaide', 'SA', 'South Australia'),
('10110', 'Adelaide Hills', 'SA', 'South Australia'),
('10180', 'Alexandrina', 'SA', 'South Australia'),
('12600', 'Ballarat', 'VIC', 'Victoria'),
('12620', 'Banyule', 'VIC', 'Victoria'),
('12650', 'Bass Coast', 'VIC', 'Victoria'),
('30250', 'Brisbane', 'QLD', 'Queensland'),
('30300', 'Bundaberg', 'QLD', 'Queensland'),
('30350', 'Cairns', 'QLD', 'Queensland'),
('11300', 'Albury', 'NSW', 'New South Wales'),
('11350', 'Armidale Regional', 'NSW', 'New South Wales'),
('11400', 'Ballina', 'NSW', 'New South Wales'),
('50200', 'Albany', 'WA', 'Western Australia'),
('50250', 'Armadale', 'WA', 'Western Australia'),
('50300', 'Ashburton', 'WA', 'Western Australia'),
('60010', 'Devonport', 'TAS', 'Tasmania'),
('60030', 'Hobart', 'TAS', 'Tasmania'),
('60050', 'Launceston', 'TAS', 'Tasmania'),
('80010', 'Darwin', 'NT', 'Northern Territory'),
('80020', 'Palmerston', 'NT', 'Northern Territory'),
('90010', 'Australian Capital Territory', 'ACT', 'Australian Capital Territory');

-- Insert sample disaster declarations
INSERT INTO disaster_declarations (
  lga_code, disaster_type, declaration_date, state_code, 
  affected_areas, severity_level, declaration_authority, 
  expiry_date, source_url, description, postcodes, source_system
) VALUES
(
  '30350', 'cyclone', '2025-01-15 06:00:00+10', 'QLD',
  '{"areas": ["Cairns CBD", "Northern Beaches", "Tablelands"]}',
  4, 'Queensland Government', '2025-03-15 23:59:59+10',
  'https://www.disaster.qld.gov.au/cyclone-alert',
  'Severe Tropical Cyclone warning for Cairns region',
  ARRAY['4870', '4871', '4872', '4873'],
  'QLD_EMERGENCY_SYSTEM'
),
(
  '11400', 'flood', '2025-01-10 08:30:00+11', 'NSW',
  '{"areas": ["Ballina CBD", "Richmond River", "Evans Head"]}',
  3, 'NSW State Emergency Service', '2025-02-28 23:59:59+11',
  'https://www.ses.nsw.gov.au/flood-warning',
  'Major flood warning for Richmond River at Ballina',
  ARRAY['2478', '2479', '2480'],
  'NSW_SES_SYSTEM'
),
(
  '12600', 'bushfire', '2025-01-08 14:00:00+11', 'VIC',
  '{"areas": ["Ballarat East", "Mount Clear", "Buninyong"]}',
  5, 'CFA Victoria', '2025-02-15 23:59:59+11',
  'https://www.cfa.vic.gov.au/warnings-restrictions',
  'Emergency bushfire warning - immediate threat to life',
  ARRAY['3350', '3351', '3352'],
  'VIC_CFA_SYSTEM'
);

-- Insert compliance templates
INSERT INTO compliance_templates (template_name, provider_type, template_content, is_active) VALUES
(
  'GP Disaster Telehealth Note',
  'GP',
  'TELEHEALTH CONSULTATION - DISASTER EXEMPTION (GP)

Date: {consultation_date}
Time: {consultation_time}
Platform: {platform_used}
Patient Location: {patient_postcode} (Active Disaster Declaration: {disaster_type})

DISASTER DECLARATION VERIFICATION:
Declaration Status: ACTIVE
LGA: {lga_name} ({lga_code})
Disaster Type: {disaster_type}
Declaration Authority: {declaration_authority}
Exemption Type: Natural Disaster (MBS Note AN.1.1)

SUBJECTIVE:
Chief Complaint: {chief_complaint}
History of Present Illness: {hpi}
Review of Systems: {ros}
Disaster-Related Factors: {disaster_factors}

OBJECTIVE:
Visual Assessment: {visual_assessment}
Vital Signs (if obtained): {vital_signs}

ASSESSMENT:
Primary Diagnosis: {primary_diagnosis}
Secondary Diagnoses: {secondary_diagnoses}

PLAN:
Treatment Plan: {treatment_plan}
Medications: {medications}
Follow-up: {follow_up}
Safety Net: {safety_instructions}

MBS COMPLIANCE:
✓ Patient located in declared disaster area
✓ 12-month relationship requirement waived due to natural disaster
✓ Geographic restrictions lifted under disaster exemption
✓ Consultation conducted via approved telehealth platform

Provider: {provider_name}
Provider Number: {provider_number}',
  true
),
(
  'NP Disaster Telehealth Note (Nov 2025 Compliant)',
  'NP',
  'TELEHEALTH CONSULTATION - NP DISASTER EXEMPTION

Date: {consultation_date}
Time: {consultation_time}
Platform: {platform_used}
Patient Location: {patient_postcode} (Active Disaster Declaration: {disaster_type})

NOVEMBER 2025 COMPLIANCE CHECK:
✓ New NP telehealth rules effective 1 November 2025
✓ Natural disaster exemption verified and documented
✓ 12-month face-to-face requirement waived

DISASTER DECLARATION VERIFICATION:
Declaration Status: ACTIVE
LGA: {lga_name} ({lga_code})
Disaster Type: {disaster_type}
Declaration Authority: {declaration_authority}
Exemption Category: Natural Disaster (People affected by natural disaster, defined as living in a local government area declared a natural disaster by a State or Territory government)

SUBJECTIVE:
Chief Complaint: {chief_complaint}
History of Present Illness: {hpi}
Review of Systems: {ros}
Disaster Impact Assessment: {disaster_impact}
Mental Health Screening: {mental_health_status}

OBJECTIVE:
Visual Assessment: {visual_assessment}
Patient Presentation: {patient_presentation}
Environmental Assessment: {environment_safety}

ASSESSMENT:
Primary Diagnosis: {primary_diagnosis}
Risk Stratification: {risk_level}
Psychosocial Considerations: {psychosocial_factors}

PLAN:
Immediate Management: {immediate_plan}
Medications: {medications}
Follow-up Arrangements: {follow_up}
Emergency Resources: {emergency_contacts}
Mental Health Support: {mental_health_resources}

NP SPECIFIC COMPLIANCE (November 2025):
✓ Disaster exemption properly documented
✓ Enhanced clinical documentation for NP scope
✓ Appropriate risk assessment completed
✓ Follow-up plan addresses disaster-related needs

Nurse Practitioner: {np_name}
NP Registration: {np_registration}
Endorsement: {np_endorsement}',
  true
);

-- Enable realtime for disaster declarations
ALTER PUBLICATION supabase_realtime ADD TABLE disaster_declarations;
ALTER TABLE disaster_declarations REPLICA IDENTITY FULL;