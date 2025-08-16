-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configure for Australian timezone
SET timezone TO 'Australia/Sydney';

-- Performance configurations
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET work_mem = '50MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
SELECT pg_reload_conf();

-- Create schemas
CREATE SCHEMA IF NOT EXISTS disaster;
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS geographic;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS healthcare;

-- Custom enum types
CREATE TYPE disaster_severity AS ENUM ('minimal', 'minor', 'moderate', 'major', 'catastrophic');
CREATE TYPE disaster_type AS ENUM ('bushfire', 'flood', 'cyclone', 'earthquake', 'pandemic', 'industrial', 'cyber', 'extreme_weather');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'disputed', 'rejected', 'expired');
CREATE TYPE provider_type AS ENUM ('GP', 'NP', 'SPECIALIST', 'ALLIED_HEALTH');

-- Australian states and territories
CREATE TABLE geographic.states_territories (
    state_code CHAR(1) PRIMARY KEY CHECK (state_code ~ '^[1-9]$'),
    state_name VARCHAR(50) NOT NULL UNIQUE,
    state_abbrev CHAR(3) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO geographic.states_territories VALUES
('1', 'New South Wales', 'NSW'),
('2', 'Victoria', 'VIC'),
('3', 'Queensland', 'QLD'),
('4', 'South Australia', 'SA'),
('5', 'Western Australia', 'WA'),
('6', 'Tasmania', 'TAS'),
('7', 'Northern Territory', 'NT'),
('8', 'Australian Capital Territory', 'ACT'),
('9', 'Other Territories', 'OT');

-- Local Government Areas with spatial data
CREATE TABLE geographic.local_government_areas (
    lga_code CHAR(5) PRIMARY KEY CHECK (lga_code ~ '^[1-9][0-9]{3}0$'),
    lga_name VARCHAR(100) NOT NULL,
    state_code CHAR(1) NOT NULL REFERENCES geographic.states_territories(state_code),
    lga_type VARCHAR(20) CHECK (lga_type IN ('CITY', 'SHIRE', 'COUNCIL', 'DISTRICT', 'UNINCORPORATED')),
    population INTEGER CHECK (population >= 0),
    area_sqkm DECIMAL(12,2) CHECK (area_sqkm > 0),
    remoteness_class VARCHAR(3) CHECK (remoteness_class IN ('RA1', 'RA2', 'RA3', 'RA4', 'RA5')),
    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_Centroid(geometry)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_lga_state CHECK (LEFT(lga_code, 1) = state_code)
);

-- Create spatial index
CREATE INDEX idx_lga_geometry ON geographic.local_government_areas USING GIST (geometry);
CREATE INDEX idx_lga_centroid ON geographic.local_government_areas USING GIST (centroid);
CREATE INDEX idx_lga_state ON geographic.local_government_areas(state_code);

-- Australian postcodes with validation
CREATE TABLE geographic.postcodes (
    postcode CHAR(4) PRIMARY KEY CHECK (postcode ~ '^[0-9]{4}$'),
    state_code CHAR(1) NOT NULL REFERENCES geographic.states_territories(state_code),
    suburb_names TEXT[] NOT NULL DEFAULT '{}',
    is_po_box BOOLEAN DEFAULT FALSE,
    geometry GEOMETRY(MULTIPOLYGON, 4326),
    centroid GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_postcode_state CHECK (
        (postcode BETWEEN '1000' AND '2999' AND state_code = '1') OR
        (postcode BETWEEN '3000' AND '3999' AND state_code = '2') OR  
        (postcode BETWEEN '4000' AND '4999' AND state_code = '3') OR
        (postcode BETWEEN '5000' AND '5999' AND state_code = '4') OR
        (postcode BETWEEN '6000' AND '6999' AND state_code = '5') OR
        (postcode BETWEEN '7000' AND '7999' AND state_code = '6') OR
        (postcode BETWEEN '0800' AND '0999' AND state_code = '7') OR
        (postcode BETWEEN '0200' AND '0299' AND state_code = '8') OR
        (postcode IN ('2611', '2620') AND state_code = '8') OR
        (state_code = '9')
    )
);

CREATE INDEX idx_postcode_geometry ON geographic.postcodes USING GIST (geometry);
CREATE INDEX idx_postcode_state ON geographic.postcodes(state_code);

-- Many-to-many postcode-LGA mapping
CREATE TABLE geographic.postcode_lga_mapping (
    id SERIAL PRIMARY KEY,
    postcode CHAR(4) NOT NULL REFERENCES geographic.postcodes(postcode),
    lga_code CHAR(5) NOT NULL REFERENCES geographic.local_government_areas(lga_code),
    coverage_percentage DECIMAL(5,2) CHECK (coverage_percentage BETWEEN 0.01 AND 100.00),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(postcode, lga_code)
);

CREATE INDEX idx_postcode_lga_postcode ON geographic.postcode_lga_mapping(postcode);
CREATE INDEX idx_postcode_lga_lga ON geographic.postcode_lga_mapping(lga_code);

-- Main disaster declarations table
CREATE TABLE disaster.declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    event_name TEXT NOT NULL,
    event_type disaster_type NOT NULL,
    severity disaster_severity NOT NULL,
    declaration_number TEXT UNIQUE,
    
    -- Temporal data
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    duration_hours INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (COALESCE(end_date, NOW()) - start_date)) / 3600
    ) STORED,
    
    -- Geographic scope
    affected_lga_codes CHAR(5)[] NOT NULL DEFAULT '{}',
    affected_postcodes CHAR(4)[] NOT NULL DEFAULT '{}',
    affected_area_km2 DECIMAL(10,2),
    epicenter GEOMETRY(POINT, 4326),
    affected_boundary GEOMETRY(MULTIPOLYGON, 4326),
    
    -- Authority and verification
    declaration_authority TEXT NOT NULL,
    authority_reference TEXT,
    verification_status verification_status DEFAULT 'pending',
    verification_score DECIMAL(3,2) CHECK (verification_score BETWEEN 0.00 AND 1.00),
    
    -- Metadata
    hazard_specific_data JSONB DEFAULT '{}',
    affected_population INTEGER,
    estimated_damage_aud DECIMAL(15,2),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > start_date)
);

-- High-performance indexes for disaster queries
CREATE INDEX idx_declarations_status ON disaster.declarations(verification_status) WHERE verification_status = 'pending';
CREATE INDEX idx_declarations_dates ON disaster.declarations(start_date DESC, end_date DESC);
CREATE INDEX idx_declarations_type_severity ON disaster.declarations(event_type, severity);
CREATE INDEX idx_declarations_lga ON disaster.declarations USING GIN(affected_lga_codes);
CREATE INDEX idx_declarations_postcodes ON disaster.declarations USING GIN(affected_postcodes);
CREATE INDEX idx_declarations_boundary ON disaster.declarations USING GIST(affected_boundary);
CREATE INDEX idx_declarations_created_brin ON disaster.declarations USING BRIN(created_at);

-- Multi-source verification tracking
CREATE TABLE disaster.verification_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (source_type IN ('BOM', 'EMERGENCY_AUS', 'STATE_GOV', 'FEDERAL_GOV', 'MEDIA', 'SATELLITE', 'IOT')),
    reliability_weight DECIMAL(3,2) CHECK (reliability_weight BETWEEN 0.00 AND 1.00) DEFAULT 0.50,
    api_endpoint TEXT,
    api_key_encrypted BYTEA,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual verification records
CREATE TABLE disaster.verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id UUID NOT NULL REFERENCES disaster.declarations(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES disaster.verification_sources(id),
    
    verification_type TEXT CHECK (verification_type IN ('confirm', 'deny', 'partial', 'update')),
    verification_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.00 AND 1.00),
    
    evidence_urls TEXT[],
    evidence_hashes TEXT[],
    
    response_time_ms INTEGER,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(declaration_id, source_id)
);

CREATE INDEX idx_verification_logs_declaration ON disaster.verification_logs(declaration_id);
CREATE INDEX idx_verification_logs_processed ON disaster.verification_logs(processed_at DESC);

-- Practice entities
CREATE TABLE healthcare.practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_name TEXT NOT NULL,
    abn TEXT UNIQUE,
    practice_type TEXT CHECK (practice_type IN ('GP_CLINIC', 'MEDICAL_CENTER', 'SPECIALIST_PRACTICE', 'ALLIED_HEALTH')),
    
    -- Location
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    suburb TEXT NOT NULL,
    postcode CHAR(4) REFERENCES geographic.postcodes(postcode),
    state_code CHAR(1) REFERENCES geographic.states_territories(state_code),
    lga_code CHAR(5) REFERENCES geographic.local_government_areas(lga_code),
    location GEOMETRY(POINT, 4326),
    
    -- Accreditation
    accreditation_status TEXT CHECK (accreditation_status IN ('ACCREDITED', 'PROVISIONAL', 'EXPIRED', 'SUSPENDED')),
    accreditation_expiry DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practices_location ON healthcare.practices USING GIST(location);
CREATE INDEX idx_practices_postcode ON healthcare.practices(postcode);
CREATE INDEX idx_practices_lga ON healthcare.practices(lga_code);

-- Healthcare providers with GP/NP differentiation
CREATE TABLE healthcare.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    
    -- Identification
    provider_type provider_type NOT NULL,
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

CREATE INDEX idx_providers_type ON healthcare.providers(provider_type);
CREATE INDEX idx_providers_practice ON healthcare.providers(primary_practice_id);
CREATE INDEX idx_providers_active ON healthcare.providers(is_active) WHERE is_active = TRUE;

-- MBS item authorization
CREATE TABLE healthcare.mbs_items (
    item_code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    rebate_amount DECIMAL(10,2),
    allowed_provider_types provider_type[] DEFAULT '{}',
    telehealth_eligible BOOLEAN DEFAULT FALSE,
    disaster_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mbs_telehealth ON healthcare.mbs_items(telehealth_eligible) WHERE telehealth_eligible = TRUE;
CREATE INDEX idx_mbs_disaster ON healthcare.mbs_items(disaster_eligible) WHERE disaster_eligible = TRUE;

-- Patients table with Australian healthcare identifiers
CREATE TABLE healthcare.patients (
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
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    suburb TEXT,
    postcode CHAR(4) REFERENCES geographic.postcodes(postcode),
    state_code CHAR(1) REFERENCES geographic.states_territories(state_code),
    
    -- Clinical
    primary_provider_id UUID REFERENCES healthcare.providers(id),
    primary_practice_id UUID REFERENCES healthcare.practices(id),
    
    -- Privacy Act compliance
    privacy_consent_date TIMESTAMPTZ,
    data_retention_consent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_provider ON healthcare.patients(primary_provider_id);
CREATE INDEX idx_patients_practice ON healthcare.patients(primary_practice_id);
CREATE INDEX idx_patients_postcode ON healthcare.patients(postcode);
CREATE INDEX idx_patients_dob ON healthcare.patients(date_of_birth);
-- Partial index for quick consent checks
CREATE INDEX idx_patients_consent ON healthcare.patients(privacy_consent_date) WHERE privacy_consent_date IS NOT NULL;

-- Telehealth consultations tracking
CREATE TABLE healthcare.consultations (
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
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60
    ) STORED,
    
    -- MBS billing
    mbs_item_code TEXT REFERENCES healthcare.mbs_items(item_code),
    bulk_billed BOOLEAN DEFAULT FALSE,
    
    -- Disaster-related
    disaster_declaration_id UUID REFERENCES disaster.declarations(id),
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

-- Composite indexes for sub-200ms performance
CREATE INDEX idx_consultations_patient_date ON healthcare.consultations(patient_id, consultation_date DESC);
CREATE INDEX idx_consultations_provider_date ON healthcare.consultations(provider_id, consultation_date DESC);
CREATE INDEX idx_consultations_status ON healthcare.consultations(status, consultation_date) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_consultations_disaster ON healthcare.consultations(disaster_declaration_id) WHERE disaster_declaration_id IS NOT NULL;
CREATE INDEX idx_consultations_date_brin ON healthcare.consultations USING BRIN(consultation_date);

-- Audit schema with partitioning support
CREATE TABLE audit.record_changes (
    id BIGSERIAL,
    
    -- Record identification
    record_id UUID NOT NULL,
    table_schema TEXT NOT NULL DEFAULT 'public',
    table_name TEXT NOT NULL,
    
    -- Change details
    operation CHAR(1) NOT NULL CHECK (operation IN ('I', 'U', 'D')),
    old_record JSONB,
    new_record JSONB,
    changed_fields TEXT[],
    
    -- User and session
    changed_by UUID NOT NULL,
    session_id TEXT,
    client_ip INET,
    user_agent TEXT,
    
    -- Timestamps
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Blockchain integration
    block_hash BYTEA,
    transaction_hash BYTEA,
    merkle_root BYTEA,
    
    -- Integrity
    record_hash TEXT NOT NULL GENERATED ALWAYS AS (
        encode(digest(
            COALESCE(old_record::text, '') || 
            COALESCE(new_record::text, '') || 
            changed_at::text, 
            'sha256'
        ), 'hex')
    ) STORED,
    
    PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create monthly partitions for 7-year retention
CREATE TABLE audit.record_changes_2024_01 PARTITION OF audit.record_changes
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE audit.record_changes_2024_02 PARTITION OF audit.record_changes
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Optimized indexes for audit queries
CREATE INDEX idx_audit_record_id ON audit.record_changes(record_id);
CREATE INDEX idx_audit_table ON audit.record_changes(table_schema, table_name);
CREATE INDEX idx_audit_user ON audit.record_changes(changed_by, changed_at DESC);
CREATE INDEX idx_audit_operation ON audit.record_changes(operation) WHERE operation IN ('U', 'D');
CREATE INDEX idx_audit_fields ON audit.record_changes USING GIN(changed_fields);
CREATE INDEX idx_audit_changed_brin ON audit.record_changes USING BRIN(changed_at);

-- Blockchain verification table
CREATE TABLE audit.blockchain_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_record_id BIGINT NOT NULL,
    
    blockchain_network TEXT DEFAULT 'ethereum',
    smart_contract_address TEXT,
    transaction_hash TEXT UNIQUE,
    block_number BIGINT,
    
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'confirmed', 'failed')),
    confirmations INTEGER DEFAULT 0,
    
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    
    gas_used BIGINT,
    transaction_cost_wei NUMERIC(78,0)
);

CREATE INDEX idx_blockchain_status ON audit.blockchain_verifications(verification_status) WHERE verification_status = 'pending';
CREATE INDEX idx_blockchain_tx_hash ON audit.blockchain_verifications USING HASH(transaction_hash);

-- Universal audit trigger function
CREATE OR REPLACE FUNCTION audit.track_record_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record_id UUID;
    v_old_jsonb JSONB;
    v_new_jsonb JSONB;
    v_changed_fields TEXT[];
    v_user_id UUID;
BEGIN
    -- Extract record ID
    IF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id;
        v_old_jsonb := to_jsonb(OLD);
        v_new_jsonb := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id;
        v_old_jsonb := NULL;
        v_new_jsonb := to_jsonb(NEW);
    ELSE -- UPDATE
        v_record_id := NEW.id;
        v_old_jsonb := to_jsonb(OLD);
        v_new_jsonb := to_jsonb(NEW);
        
        -- Calculate changed fields
        SELECT array_agg(key) INTO v_changed_fields
        FROM jsonb_each_text(v_old_jsonb) o1
        FULL JOIN jsonb_each_text(v_new_jsonb) o2 ON o1.key = o2.key
        WHERE o1.value IS DISTINCT FROM o2.value;
    END IF;
    
    -- Get current user ID
    v_user_id := COALESCE(
        current_setting('app.current_user_id', TRUE)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
    
    -- Insert audit record
    INSERT INTO audit.record_changes (
        record_id, table_schema, table_name, operation,
        old_record, new_record, changed_fields,
        changed_by, session_id, client_ip
    ) VALUES (
        v_record_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, LEFT(TG_OP, 1),
        v_old_jsonb, v_new_jsonb, v_changed_fields,
        v_user_id, current_setting('application_name', TRUE), inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_disaster_declarations
    AFTER INSERT OR UPDATE OR DELETE ON disaster.declarations
    FOR EACH ROW EXECUTE FUNCTION audit.track_record_changes();

CREATE TRIGGER audit_consultations
    AFTER INSERT OR UPDATE OR DELETE ON healthcare.consultations
    FOR EACH ROW EXECUTE FUNCTION audit.track_record_changes();

CREATE TRIGGER audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON healthcare.patients
    FOR EACH ROW EXECUTE FUNCTION audit.track_record_changes();

CREATE TRIGGER audit_providers
    AFTER INSERT OR UPDATE OR DELETE ON healthcare.providers
    FOR EACH ROW EXECUTE FUNCTION audit.track_record_changes();

-- Enable RLS on all healthcare tables
ALTER TABLE healthcare.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster.declarations ENABLE ROW LEVEL SECURITY;

-- Patient data access policy
CREATE POLICY patient_access_policy ON healthcare.patients
FOR ALL TO authenticated
USING (
    -- Patients can access their own data
    user_id = auth.uid()
    OR
    -- Providers can access patients in their practice
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

-- Provider access policy
CREATE POLICY provider_access_policy ON healthcare.providers
FOR SELECT TO authenticated
USING (
    -- Providers can see other providers in their practice
    primary_practice_id IN (
        SELECT primary_practice_id 
        FROM healthcare.providers 
        WHERE user_id = auth.uid()
    )
    OR
    -- Public provider directory (limited fields via view)
    is_active = TRUE
);

-- Consultation access policy
CREATE POLICY consultation_access_policy ON healthcare.consultations
FOR ALL TO authenticated
USING (
    -- Patients can access their own consultations
    patient_id IN (
        SELECT id FROM healthcare.patients WHERE user_id = auth.uid()
    )
    OR
    -- Providers can access their consultations
    provider_id IN (
        SELECT id FROM healthcare.providers WHERE user_id = auth.uid()
    )
);

-- Disaster declaration public read policy
CREATE POLICY disaster_public_read ON disaster.declarations
FOR SELECT TO authenticated
USING (verification_status IN ('verified', 'pending'));

-- Real-time channels configuration
CREATE TABLE realtime.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name TEXT NOT NULL UNIQUE,
    channel_type TEXT CHECK (channel_type IN ('disaster', 'consultation', 'emergency', 'system')),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE realtime.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel_id UUID REFERENCES realtime.channels(id),
    filters JSONB DEFAULT '{}',
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_notification_at TIMESTAMPTZ,
    
    UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_subscriptions_user ON realtime.subscriptions(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_subscriptions_channel ON realtime.subscriptions(channel_id) WHERE is_active = TRUE;

-- Real-time trigger for disaster declarations
CREATE OR REPLACE FUNCTION realtime.notify_disaster_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify(
        'disaster_updates',
        json_build_object(
            'operation', TG_OP,
            'declaration_id', NEW.id,
            'event_type', NEW.event_type,
            'severity', NEW.severity,
            'affected_lgas', NEW.affected_lga_codes,
            'affected_postcodes', NEW.affected_postcodes
        )::text
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER disaster_realtime_trigger
    AFTER INSERT OR UPDATE ON disaster.declarations
    FOR EACH ROW 
    WHEN (NEW.verification_status = 'verified')
    EXECUTE FUNCTION realtime.notify_disaster_update();

-- Retention policies table
CREATE TABLE compliance.retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL UNIQUE,
    retention_years INTEGER NOT NULL CHECK (retention_years >= 7),
    
    -- Australian healthcare compliance
    compliance_framework TEXT NOT NULL DEFAULT 'Australian Healthcare Records',
    applies_to_children BOOLEAN DEFAULT TRUE,
    child_retention_until_age INTEGER DEFAULT 25,
    
    last_cleanup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert required retention policies
INSERT INTO compliance.retention_policies (table_name, retention_years) VALUES
('healthcare.patients', 7),
('healthcare.consultations', 7),
('healthcare.providers', 7),
('audit.record_changes', 7),
('disaster.declarations', 10),
('disaster.verification_logs', 7);

-- Automated retention management function
CREATE OR REPLACE FUNCTION compliance.apply_retention_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_policy RECORD;
    v_cutoff_date DATE;
    v_rows_deleted INTEGER;
BEGIN
    FOR v_policy IN SELECT * FROM compliance.retention_policies LOOP
        v_cutoff_date := CURRENT_DATE - (v_policy.retention_years || ' years')::INTERVAL;
        
        -- Standard cleanup for tables
        EXECUTE format('
            DELETE FROM %I 
            WHERE created_at < %L',
            v_policy.table_name, v_cutoff_date
        );
        
        -- Update cleanup timestamp
        UPDATE compliance.retention_policies 
        SET last_cleanup_at = NOW()
        WHERE id = v_policy.id;
    END LOOP;
END;
$$;

-- Materialized view for provider availability
CREATE MATERIALIZED VIEW healthcare.provider_availability AS
SELECT 
    p.id as provider_id,
    p.provider_type,
    p.first_name || ' ' || p.last_name as provider_name,
    pr.practice_name,
    pr.postcode,
    pr.lga_code,
    COUNT(c.id) FILTER (WHERE c.consultation_date >= CURRENT_DATE) as upcoming_appointments,
    COUNT(c.id) FILTER (WHERE c.consultation_date = CURRENT_DATE) as today_appointments,
    p.telehealth_enabled,
    p.video_consultation_available
FROM healthcare.providers p
JOIN healthcare.practices pr ON p.primary_practice_id = pr.id
LEFT JOIN healthcare.consultations c ON p.id = c.provider_id
WHERE p.is_active = TRUE
GROUP BY p.id, p.provider_type, p.first_name, p.last_name, 
         pr.practice_name, pr.postcode, pr.lga_code,
         p.telehealth_enabled, p.video_consultation_available;

CREATE UNIQUE INDEX idx_provider_availability_id ON healthcare.provider_availability(provider_id);
CREATE INDEX idx_provider_availability_postcode ON healthcare.provider_availability(postcode);
CREATE INDEX idx_provider_availability_lga ON healthcare.provider_availability(lga_code);

-- Function for geographic search optimization
CREATE OR REPLACE FUNCTION healthcare.find_nearby_providers(
    p_latitude FLOAT,
    p_longitude FLOAT,
    p_radius_km INTEGER DEFAULT 10,
    p_provider_type provider_type DEFAULT NULL
)
RETURNS TABLE (
    provider_id UUID,
    provider_name TEXT,
    provider_type provider_type,
    practice_name TEXT,
    distance_km FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH search_point AS (
        SELECT ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography as point
    )
    SELECT 
        p.id,
        p.first_name || ' ' || p.last_name,
        p.provider_type,
        pr.practice_name,
        ST_Distance(pr.location::geography, sp.point) / 1000.0 as distance_km
    FROM healthcare.providers p
    JOIN healthcare.practices pr ON p.primary_practice_id = pr.id
    CROSS JOIN search_point sp
    WHERE ST_DWithin(pr.location::geography, sp.point, p_radius_km * 1000)
    AND p.is_active = TRUE
    AND (p_provider_type IS NULL OR p.provider_type = p_provider_type)
    ORDER BY distance_km
    LIMIT 20;
END;
$$;

-- Automated disaster verification
CREATE OR REPLACE FUNCTION disaster.verify_declaration(
    p_declaration_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_verification_scores JSONB := '[]'::JSONB;
    v_source RECORD;
    v_final_score DECIMAL(3,2);
    v_status verification_status;
BEGIN
    -- Collect verifications from all sources
    FOR v_source IN 
        SELECT vs.*, vl.confidence_score
        FROM disaster.verification_sources vs
        LEFT JOIN disaster.verification_logs vl 
            ON vs.id = vl.source_id 
            AND vl.declaration_id = p_declaration_id
        WHERE vs.is_active = TRUE
    LOOP
        v_verification_scores := v_verification_scores || 
            jsonb_build_object(
                'source', v_source.source_name,
                'score', COALESCE(v_source.confidence_score, 0),
                'weight', v_source.reliability_weight
            );
    END LOOP;
    
    -- Calculate weighted average score
    SELECT 
        SUM((obj->>'score')::DECIMAL * (obj->>'weight')::DECIMAL) / 
        NULLIF(SUM((obj->>'weight')::DECIMAL), 0)
    INTO v_final_score
    FROM jsonb_array_elements(v_verification_scores) obj;
    
    -- Determine status based on score
    v_status := CASE
        WHEN v_final_score >= 0.80 THEN 'verified'
        WHEN v_final_score >= 0.50 THEN 'pending'
        WHEN v_final_score >= 0.20 THEN 'disputed'
        ELSE 'rejected'
    END;
    
    -- Update declaration
    UPDATE disaster.declarations
    SET 
        verification_score = v_final_score,
        verification_status = v_status,
        updated_at = NOW()
    WHERE id = p_declaration_id;
    
    RETURN jsonb_build_object(
        'declaration_id', p_declaration_id,
        'final_score', v_final_score,
        'status', v_status,
        'verifications', v_verification_scores
    );
END;
$$;

-- Check consultation compliance
CREATE OR REPLACE FUNCTION healthcare.check_telehealth_compliance(
    p_consultation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_consultation healthcare.consultations%ROWTYPE;
    v_issues TEXT[] := '{}';
    v_compliant BOOLEAN := TRUE;
BEGIN
    SELECT * INTO v_consultation 
    FROM healthcare.consultations 
    WHERE id = p_consultation_id;
    
    -- Check established relationship for telehealth
    IF v_consultation.consultation_type IN ('video', 'phone') THEN
        IF NOT v_consultation.established_relationship_verified THEN
            v_issues := v_issues || 'No established clinical relationship';
            v_compliant := FALSE;
        END IF;
        
        -- Check 12-month rule
        IF v_consultation.last_face_to_face_date < CURRENT_DATE - INTERVAL '12 months' THEN
            v_issues := v_issues || 'Face-to-face consultation older than 12 months';
            v_compliant := FALSE;
        END IF;
    END IF;
    
    -- Check clinical notes
    IF NOT v_consultation.clinical_notes_recorded THEN
        v_issues := v_issues || 'Clinical notes not recorded';
        v_compliant := FALSE;
    END IF;
    
    RETURN jsonb_build_object(
        'consultation_id', p_consultation_id,
        'compliant', v_compliant,
        'issues', v_issues,
        'checked_at', NOW()
    );
END;
$$;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA disaster TO authenticated;
GRANT USAGE ON SCHEMA healthcare TO authenticated;
GRANT USAGE ON SCHEMA geographic TO authenticated;
GRANT USAGE ON SCHEMA compliance TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA geographic TO authenticated;

-- Final optimization: Set table parameters for high-performance
ALTER TABLE healthcare.consultations SET (fillfactor = 90);
ALTER TABLE disaster.declarations SET (fillfactor = 85);
ALTER TABLE audit.record_changes SET (autovacuum_vacuum_scale_factor = 0.1);