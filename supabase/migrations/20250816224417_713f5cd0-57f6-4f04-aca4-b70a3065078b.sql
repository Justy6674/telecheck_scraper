-- Add healthcare schema tables (only if not existing)
CREATE SCHEMA IF NOT EXISTS healthcare;

-- Healthcare practices table
CREATE TABLE IF NOT EXISTS healthcare.practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_name TEXT NOT NULL,
    abn TEXT UNIQUE,
    practice_type TEXT CHECK (practice_type IN ('GP_CLINIC', 'MEDICAL_CENTER', 'SPECIALIST_PRACTICE', 'ALLIED_HEALTH')),
    
    -- Location (referencing existing geographic tables)
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    suburb TEXT NOT NULL,
    postcode CHAR(4),
    state_code CHAR(1),
    location GEOMETRY(POINT, 4326),
    
    -- Accreditation
    accreditation_status TEXT CHECK (accreditation_status IN ('ACCREDITED', 'PROVISIONAL', 'EXPIRED', 'SUSPENDED')),
    accreditation_expiry DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Healthcare providers table
CREATE TABLE IF NOT EXISTS healthcare.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    
    -- Identification
    provider_type provider_type_enum NOT NULL,
    ahpra_number TEXT UNIQUE,
    prescriber_number TEXT,
    hpi_i TEXT UNIQUE, -- Healthcare Provider Identifier Individual
    medicare_provider_number TEXT,
    
    -- Personal details
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    
    -- Practice affiliation
    primary_practice_id UUID REFERENCES healthcare.practices(id),
    
    -- Capabilities based on provider type
    can_prescribe BOOLEAN DEFAULT FALSE,
    can_refer BOOLEAN DEFAULT FALSE,
    can_bulk_bill BOOLEAN DEFAULT FALSE,
    mbs_items_authorized TEXT[] DEFAULT '{}',
    
    -- Telehealth specific
    telehealth_enabled BOOLEAN DEFAULT TRUE,
    video_consultation_available BOOLEAN DEFAULT TRUE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table with Australian healthcare identifiers
CREATE TABLE IF NOT EXISTS healthcare.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    
    -- Healthcare identifiers
    ihi TEXT UNIQUE, -- Individual Healthcare Identifier (16 digits)
    medicare_number TEXT,
    medicare_irn CHAR(1),
    dva_number TEXT,
    
    -- Personal information (encrypted at rest)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'X')),
    
    -- Contact details
    email TEXT,
    mobile_phone TEXT,
    
    -- Address (referencing existing geographic tables)
    address_line1 TEXT,
    address_line2 TEXT,
    suburb TEXT,
    postcode CHAR(4),
    state_code CHAR(1),
    
    -- Clinical
    primary_provider_id UUID REFERENCES healthcare.providers(id),
    primary_practice_id UUID REFERENCES healthcare.practices(id),
    
    -- Privacy Act compliance
    privacy_consent_date TIMESTAMPTZ,
    data_retention_consent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MBS items table
CREATE TABLE IF NOT EXISTS healthcare.mbs_items (
    item_code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    rebate_amount DECIMAL(10,2),
    allowed_provider_types provider_type_enum[] DEFAULT '{}',
    telehealth_eligible BOOLEAN DEFAULT FALSE,
    disaster_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telehealth consultations tracking
CREATE TABLE IF NOT EXISTS healthcare.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Participants
    patient_id UUID NOT NULL REFERENCES healthcare.patients(id),
    provider_id UUID NOT NULL REFERENCES healthcare.providers(id),
    practice_id UUID REFERENCES healthcare.practices(id),
    
    -- Consultation details
    consultation_type TEXT NOT NULL CHECK (consultation_type IN ('video', 'phone', 'face_to_face')),
    consultation_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- MBS billing
    mbs_item_code TEXT REFERENCES healthcare.mbs_items(item_code),
    bulk_billed BOOLEAN DEFAULT FALSE,
    
    -- Disaster-related (references existing disaster tables)
    disaster_declaration_id UUID,
    is_disaster_related BOOLEAN DEFAULT FALSE,
    
    -- Compliance
    established_relationship_verified BOOLEAN DEFAULT FALSE,
    last_face_to_face_date DATE,
    clinical_notes_recorded BOOLEAN DEFAULT FALSE,
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practices_location ON healthcare.practices USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_practices_postcode ON healthcare.practices(postcode);
CREATE INDEX IF NOT EXISTS idx_providers_type ON healthcare.providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_practice ON healthcare.providers(primary_practice_id);
CREATE INDEX IF NOT EXISTS idx_providers_active ON healthcare.providers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_patients_provider ON healthcare.patients(primary_provider_id);
CREATE INDEX IF NOT EXISTS idx_patients_practice ON healthcare.patients(primary_practice_id);
CREATE INDEX IF NOT EXISTS idx_patients_postcode ON healthcare.patients(postcode);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_date ON healthcare.consultations(patient_id, consultation_date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_provider_date ON healthcare.consultations(provider_id, consultation_date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON healthcare.consultations(status, consultation_date) WHERE status IN ('scheduled', 'in_progress');

-- Enable RLS on healthcare tables
ALTER TABLE healthcare.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare.mbs_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to MBS items" ON healthcare.mbs_items
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Providers can view public practice info" ON healthcare.practices
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Providers can view other providers in practice" ON healthcare.providers
FOR SELECT TO authenticated
USING (
    primary_practice_id IN (
        SELECT primary_practice_id 
        FROM healthcare.providers 
        WHERE user_id = auth.uid()
    )
    OR is_active = TRUE
);

CREATE POLICY "Users can view own patient data" ON healthcare.patients
FOR ALL TO authenticated
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM healthcare.providers p
        WHERE p.user_id = auth.uid()
        AND p.is_active = TRUE
        AND (
            p.id = healthcare.patients.primary_provider_id
            OR
            p.primary_practice_id = healthcare.patients.primary_practice_id
        )
    )
);

CREATE POLICY "Users can view own consultations" ON healthcare.consultations
FOR ALL TO authenticated
USING (
    patient_id IN (
        SELECT id FROM healthcare.patients WHERE user_id = auth.uid()
    )
    OR
    provider_id IN (
        SELECT id FROM healthcare.providers WHERE user_id = auth.uid()
    )
);

-- Grant permissions to healthcare schema
GRANT USAGE ON SCHEMA healthcare TO authenticated, anon;
GRANT SELECT ON healthcare.mbs_items TO authenticated, anon;
GRANT SELECT ON healthcare.practices TO authenticated;
GRANT ALL ON healthcare.providers TO authenticated;
GRANT ALL ON healthcare.patients TO authenticated;
GRANT ALL ON healthcare.consultations TO authenticated;