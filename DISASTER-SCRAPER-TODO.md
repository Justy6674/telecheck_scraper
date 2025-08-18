# 🚨 DISASTER SCRAPER - COMPLETE TODO & IMPLEMENTATION PLAN

## 🎯 MISSION CRITICAL
**Medicare Telehealth Eligibility Verification System**
- Practitioners enter patient postcode
- System returns ELIGIBLE / NOT ELIGIBLE / POSSIBLY ELIGIBLE
- Provides copy-paste text for Medicare claims
- Full audit trail for legal compliance

---

## ✅ COMPLETED TASKS

### 1. ✅ Database Schema Design
- Created `disaster_declarations` table with comprehensive `affected_areas` JSON field
- Stores ALL data from DisasterAssist pages
- Includes LGAs, assistance programs, dates, URLs, full text

### 2. ✅ LGA Extraction Logic
- Extracts ALL lists from disaster pages
- Identifies actual LGA names vs navigation items
- Maps LGA names to official LGA codes
- Handles multiple formats (narrative text, bullet points, lists)

### 3. ✅ Complete Data Extraction
- Tested on Cyclone Alfred (QLD) - 18 LGAs extracted
- Tested on NSW Severe Weather - 10 LGAs extracted
- Captures assistance details, payment amounts, deadlines
- Stores source URLs for practitioner verification

---

## 🔴 PENDING TASKS

### 1. 🔴 Update Railway Scraper Service
**File**: `/railway-scraper-service/index.js`
**Actions**:
- Remove hardcoded LGA code (31000)
- Remove slice(0,10) limitation
- Add click-through to detail pages
- Implement complete data extraction logic
- Store ALL LGAs in affected_areas JSON

### 2. 🔴 Create Full Import Script
**File**: `scrape-all-760-disasters.mjs`
**Actions**:
- Loop through ALL 38+ pages of disasters
- Click into EVERY disaster detail page
- Extract complete data for each
- Handle pagination properly
- Save all 760+ disasters to database

### 3. 🔴 Update Frontend Display
**File**: `src/pages/Index.tsx`
**Actions**:
- Show eligibility status (ELIGIBLE/NOT ELIGIBLE/POSSIBLY)
- Display disaster details with dates
- Provide copy-paste text for Medicare
- Include verification URL link
- Show all relevant disasters for postcode

### 4. 🔴 Implement Postcode Search Logic
**File**: `src/services/disasterService.ts`
**Actions**:
```javascript
// Search logic
function searchDisastersByPostcode(postcode) {
  // 1. Get LGA for postcode
  const lga = await getLGAForPostcode(postcode);
  
  // 2. Search disasters where LGA appears in affected_areas
  const disasters = await supabase
    .from('disaster_declarations')
    .select('*')
    .or(`lga_code.eq.${lga.code},affected_areas->all_lga_codes.cs.["${lga.code}"]`);
    
  // 3. Return with eligibility status
  return disasters.map(d => ({
    status: determineEligibility(d, lga),
    disaster: d,
    copyPasteText: generateMedicareText(d)
  }));
}
```

### 5. 🔴 Deploy Railway Scraper
**Actions**:
- Push updated scraper to Railway
- Set environment variables
- Configure daily/hourly runs
- Monitor first full import

### 6. 🔴 Run Full 760+ Disaster Import
**Actions**:
- Execute complete scraping script
- Verify all disasters imported
- Check LGA mappings are correct
- Test sample postcodes

### 7. 🔴 Create Audit Trail System
**Files**: New audit components
**Actions**:
- Log all practitioner searches
- Store verification requests
- Track which disasters were checked
- Generate compliance reports

### 8. 🔴 Deploy to Production
**URL**: www.telecheck.com.au
**Actions**:
- Deploy frontend to Vercel/Netlify
- Ensure Supabase connection
- Configure domain
- SSL certificates
- Test end-to-end

---

## 📊 DATA STRUCTURE FOR PRACTITIONERS

### Input: Postcode (e.g., 2337)
### Output:
```javascript
{
  status: "ELIGIBLE",
  disasters: [
    {
      event_name: "NSW Severe Weather Event",
      agrn: "AGRN-1216",
      dates: "31 July 2025 onwards",
      description: "Severe weather affecting...",
      verification_url: "https://disasterassist.gov.au/...",
      copy_paste_text: "Patient eligible for telehealth under AGRN-1216..."
    }
  ]
}
```

---

## 🔐 AUDIT & COMPLIANCE REQUIREMENTS

### Must Store:
1. **Full page content** - For legal verification
2. **Extraction timestamp** - When data was collected
3. **Source URLs** - Direct links to government site
4. **All affected areas** - Complete LGA lists
5. **Practitioner queries** - Who searched what, when
6. **Verification clicks** - Track URL visits

### Medicare Compliance:
- Must show AGRN reference
- Must show disaster dates
- Must provide verification link
- Must maintain audit trail

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Railway scraper updated and deployed
- [ ] Full 760+ disasters imported
- [ ] Frontend showing correct eligibility
- [ ] Copy-paste text working
- [ ] Verification URLs active
- [ ] Audit logging enabled
- [ ] Production domain configured
- [ ] SSL certificates active
- [ ] Performance optimized
- [ ] Compliance verified

---

## 📝 CRITICAL NOTES

1. **NEVER** hardcode LGA codes - always extract from page
2. **ALWAYS** store complete page data for audit
3. **MUST** provide verification URLs for practitioners
4. **CRITICAL** - This is healthcare, accuracy matters
5. **PEOPLE DIE** if eligibility is wrong

---

## 🔄 DAILY OPERATIONS

Once deployed, the system must:
1. Run scraper daily to catch new disasters
2. Update existing disasters if changes detected
3. Archive expired disasters
4. Generate daily audit reports
5. Monitor for DisasterAssist site changes

---

## 📞 SUPPORT & MONITORING

- Error alerts to: [admin email]
- Daily reports to: [compliance team]
- Practitioner support: 1800 XXX XXX
- Technical support: [dev team]

---

**Last Updated**: 17 January 2025
**Status**: IN DEVELOPMENT
**Target Launch**: [Date]
**Compliance Review**: PENDING