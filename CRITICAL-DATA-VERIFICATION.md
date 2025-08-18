# 🚨 CRITICAL DATA VERIFICATION NEEDED - MEDICARE COMPLIANCE AT RISK

## PAUSED ALL SCRAPERS - DATA VERIFICATION REQUIRED

### CRITICAL ISSUES REQUIRING VERIFICATION:

## 1. POSTCODE TO LGA MAPPING ACCURACY
**Current State:**
- Only 274 postcodes mapped (out of ~3,000 in Australia)
- Mappings were manually created, not from authoritative source
- Example concerns:
  - Is postcode 2000 really Sydney LGA or City of Sydney?
  - Is postcode 4000 Brisbane City or Brisbane CBD?
  - Are suburb postcodes correctly mapped to their councils?

**RISK:** If postcode→LGA mapping is wrong, practitioners will get incorrect telehealth eligibility = $500,000 fines

## 2. POPULATION DATA ACCURACY
**Current State:**
- Population figures in database (e.g., Brisbane: 1,280,000)
- Source of these numbers is UNKNOWN
- No timestamp for when population was recorded
- No source attribution (ABS Census? Council data? Estimates?)

**Examples of concerns:**
- Sydney LGA shows 250,000 (seems low - is this just CBD?)
- Perth shows 22,000 (definitely wrong - that's just CBD)
- Darwin Waterfront Precinct 83,000 (is this all of Darwin?)

**RISK:** Wrong population numbers = wrong impact assessment = wrong government funding

## 3. LGA NAME MATCHING ISSUES
**Problems Found:**
- "Central Coast (NSW)" vs "Central Coast"
- "Australian Capital Territory" not found
- "Norwood Payneham St Peters" not found
- Different naming conventions between datasets

**RISK:** LGAs not matching = disasters not linked = patients denied telehealth

## REQUIRED VERIFICATION SOURCES:

### 1. AUTHORITATIVE POSTCODE DATA
**Options:**
- Australia Post Postcode File (PAF) - Official but costs money
- ABS Postcode to LGA mappings (free, from Census)
- data.gov.au postcode datasets

**Need:**
- Complete list of all Australian postcodes
- Accurate mapping to LGA codes
- Regular updates for new developments

### 2. AUTHORITATIVE LGA DATA
**Options:**
- ABS Local Government Areas dataset
- Department of Infrastructure LGA boundaries
- State government LGA registries

**Need:**
- Official LGA codes (5-digit ABS codes)
- Official LGA names
- Current population from latest Census
- Geographic boundaries

### 3. CROSS-VERIFICATION SYSTEM
**Build:**
```javascript
// For each postcode search:
1. Primary lookup in our mapping
2. Secondary verification via:
   - Geocoding API (postcode → lat/lng → LGA)
   - External API check
   - Manual override table for known issues
3. Flag any discrepancies for review
```

## IMMEDIATE ACTIONS NEEDED:

### Step 1: Get Authoritative Data
```bash
# Download ABS postcode to LGA correspondence
wget https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/correspondences/postcode-2021-to-lga-2021.csv

# Download ABS LGA data with populations
wget https://www.abs.gov.au/census/find-census-data/datapacks/download/2021_GCP_LGA_for_AUS_short-header.zip
```

### Step 2: Verify Current Data
- Check 10 random postcodes against Australia Post
- Verify 10 LGA populations against ABS Census 2021
- Test edge cases (remote areas, new suburbs, ACT)

### Step 3: Build Verification Table
```sql
CREATE TABLE postcode_lga_verification (
  id SERIAL PRIMARY KEY,
  postcode VARCHAR(4),
  our_lga_name TEXT,
  our_lga_code VARCHAR(5),
  abs_lga_name TEXT,
  abs_lga_code VARCHAR(5),
  match_status VARCHAR(20), -- 'exact', 'partial', 'mismatch'
  verified_population INTEGER,
  population_source TEXT,
  last_verified TIMESTAMP DEFAULT NOW()
);
```

## CRITICAL MEDICARE REQUIREMENTS:

1. **100% Accuracy Required**
   - Wrong postcode = wrong eligibility
   - Wrong eligibility = Medicare fraud
   - Medicare fraud = $500,000 fine + criminal charges

2. **Audit Trail Required**
   - Source of every data point
   - Timestamp of every verification
   - Authority for every mapping

3. **Regular Updates Required**
   - New postcodes added monthly
   - LGA boundary changes annually
   - Population updates from Census

## DO NOT PROCEED UNTIL:

✅ Authoritative postcode dataset loaded
✅ All LGA populations verified against ABS
✅ Cross-verification system operational
✅ Audit trail implemented
✅ Test with 100 real patient postcodes

## VERIFICATION CHECKLIST:

- [ ] Download ABS Postcode to LGA correspondence file
- [ ] Download ABS Census 2021 LGA populations
- [ ] Load into verification tables
- [ ] Compare with current data
- [ ] Fix all mismatches
- [ ] Document data sources
- [ ] Implement cross-check system
- [ ] Test with edge cases
- [ ] Get sign-off before go-live

**THIS IS NOT OPTIONAL - PEOPLE'S MEDICARE NUMBERS AND LICENCES ARE ON THE LINE**