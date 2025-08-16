-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configure for Australian timezone
SET timezone TO 'Australia/Sydney';

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
    geometry GEOMETRY(MULTIPOLYGON, 4326),
    centroid GEOMETRY(POINT, 4326),
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

-- Enable RLS on geographic tables
ALTER TABLE geographic.states_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic.local_government_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic.postcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic.postcode_lga_mapping ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to geographic data
CREATE POLICY "Public read access to states" ON geographic.states_territories
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Public read access to LGAs" ON geographic.local_government_areas
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Public read access to postcodes" ON geographic.postcodes
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "Public read access to postcode mappings" ON geographic.postcode_lga_mapping
FOR SELECT TO authenticated, anon
USING (true);

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA geographic TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA geographic TO authenticated, anon;