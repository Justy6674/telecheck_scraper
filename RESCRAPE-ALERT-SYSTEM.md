# 🚨 DISASTER RE-SCRAPING & ALERT SYSTEM FOR MEDICARE COMPLIANCE

## Critical for Preventing $500,000 Medicare Fines

## 1. RE-SCRAPING SCHEDULE

### 3x Weekly Active Disaster Check (Mon, Wed, Sat)
- **Target**: Only disasters with `expiry_date = NULL`
- **Purpose**: Detect if any active disasters have ended
- **Days**: Monday, Wednesday, Saturday
- **Time**: 6am AEST
- **Script**: `scrape-active-disasters-only.mjs`
- **Duration**: ~15-30 minutes for ~400 active disasters

### Weekly Full Validation (Sunday)
- **Target**: All active disasters with deep validation
- **Purpose**: Comprehensive check including LGA changes
- **Time**: Sunday 2am AEST
- **Script**: `scrape-validate-active.mjs`
- **Duration**: ~1 hour

### Monthly Complete Scrape (1st of month)
- **Target**: ALL 760+ disasters (complete refresh)
- **Purpose**: Find new disasters, validate everything
- **Time**: 1st of month, 1am AEST
- **Script**: `scrape-all-disasters-puppeteer.mjs`
- **Duration**: ~2-3 hours

## 2. DATABASE SCHEMA FOR TRACKING CHANGES

```sql
-- Track disaster status changes
CREATE TABLE disaster_status_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agrn_reference VARCHAR(50),
  change_type VARCHAR(50), -- 'ended', 'new', 'lga_added', 'lga_removed'
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_end_date DATE,
  new_end_date DATE,
  affected_lgas JSONB,
  affected_postcodes JSONB,
  detected_at TIMESTAMP DEFAULT NOW(),
  alert_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track which practitioners have seen alerts
CREATE TABLE alert_acknowledgments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  change_id UUID REFERENCES disaster_status_changes(id),
  practitioner_id VARCHAR(255),
  acknowledged_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(50)
);

-- Recent activity log
CREATE TABLE disaster_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type VARCHAR(50), -- 'scrape_started', 'scrape_completed', 'changes_detected'
  disasters_checked INTEGER,
  changes_found INTEGER,
  new_disasters INTEGER,
  ended_disasters INTEGER,
  details JSONB,
  occurred_at TIMESTAMP DEFAULT NOW()
);
```

## 3. ALERT CATEGORIES & DISPLAY RULES

### 🔴 CRITICAL ALERTS (Red Banner - 30 days visibility)
**"DISASTER ENDED - STOP TELEHEALTH BILLING"**
```
⚠️ CRITICAL: The following disaster has ENDED as of [DATE]
Disaster: [NAME]
AGRN: [AGRN-XXX]
Affected LGAs: [List]
Affected Postcodes: [List]

IMMEDIATE ACTION REQUIRED:
- Stop using telehealth item numbers for patients in these areas
- Verify patient eligibility before any telehealth consultation
- [View Official Notice]
```

### 🟡 WARNING ALERTS (Yellow Banner - 14 days visibility)
**"LGA REMOVED FROM DISASTER"**
```
⚠️ WARNING: LGAs removed from active disaster
Disaster: [NAME]
Removed LGAs: [List]
Removed Postcodes: [List]
Effective: [DATE]

ACTION: Verify patient addresses before telehealth
```

### 🟢 NEW DISASTER ALERTS (Green Banner - 7 days visibility)
**"NEW DISASTER - TELEHEALTH NOW AVAILABLE"**
```
✅ NEW: Disaster declared - Telehealth eligible
Disaster: [NAME]
AGRN: [AGRN-XXX]
Affected LGAs: [List]
Affected Postcodes: [List]
Declaration Date: [DATE]

Patients in these areas are now eligible for telehealth
```

## 4. RE-SCRAPING SCRIPTS

### Daily Active-Only Scraper
```javascript
// scrape-active-disasters-only.mjs
async function rescrapeActiveDisasters() {
  // 1. Get all active disasters from database
  const { data: activeDisasters } = await supabase
    .from('disaster_declarations')
    .select('agrn_reference, source_url, expiry_date')
    .is('expiry_date', null);
  
  console.log(`Found ${activeDisasters.length} active disasters to check`);
  
  // 2. Visit each disaster page
  for (const disaster of activeDisasters) {
    const pageData = await scrapeSingleDisaster(disaster.source_url);
    
    // 3. Check if status changed
    if (pageData.endDate && !disaster.expiry_date) {
      // DISASTER HAS ENDED!
      await createCriticalAlert({
        type: 'ended',
        disaster: disaster,
        endDate: pageData.endDate,
        affectedAreas: pageData.lgas
      });
    }
    
    // 4. Check for LGA changes
    const lgaChanges = detectLGAChanges(disaster, pageData);
    if (lgaChanges.removed.length > 0) {
      await createWarningAlert({
        type: 'lga_removed',
        disaster: disaster,
        removedLGAs: lgaChanges.removed
      });
    }
  }
}
```

## 5. DASHBOARD INTEGRATION

### Alert Display Component
```jsx
// DisasterAlerts.jsx
const DisasterAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    // Get unexpired, unacknowledged alerts
    fetchActiveAlerts();
  }, []);
  
  return (
    <div className="disaster-alerts">
      {alerts.map(alert => (
        <Alert
          key={alert.id}
          severity={alert.change_type === 'ended' ? 'critical' : 'warning'}
          dismissible={alert.change_type !== 'ended'}
          expiresIn={alert.alert_expires_at}
        >
          <AlertTitle>{getAlertTitle(alert)}</AlertTitle>
          <AlertContent>
            {getAlertMessage(alert)}
            <PostcodeList postcodes={alert.affected_postcodes} />
            <Button onClick={() => acknowledgeAlert(alert.id)}>
              I understand - Mark as read
            </Button>
          </AlertContent>
        </Alert>
      ))}
    </div>
  );
};
```

### Dashboard Sections
```
┌─────────────────────────────────────────────┐
│ 🔴 CRITICAL ALERTS - ACTION REQUIRED        │
│ 3 disasters ended - Stop telehealth billing │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📊 RECENT CHANGES (Last 30 days)            │
│ • 5 disasters ended                         │
│ • 8 new disasters declared                  │
│ • 12 LGA changes                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✅ CURRENTLY ACTIVE DISASTERS               │
│ 387 active disasters across Australia       │
│ [View Map] [Download List]                  │
└─────────────────────────────────────────────┘
```

## 6. NOTIFICATION SYSTEM

### Email Alerts (for critical changes)
```javascript
async function sendCriticalAlert(change) {
  const practitioners = await getRegisteredPractitioners();
  
  for (const practitioner of practitioners) {
    if (practitioner.servicesLGAs.some(lga => 
      change.affected_lgas.includes(lga)
    )) {
      await sendEmail({
        to: practitioner.email,
        subject: '🔴 CRITICAL: Disaster Ended - Stop Telehealth Billing',
        template: 'disaster-ended',
        data: {
          disasterName: change.disaster_name,
          endDate: change.new_end_date,
          lgas: change.affected_lgas,
          postcodes: change.affected_postcodes
        }
      });
    }
  }
}
```

## 7. DEPLOYMENT SCHEDULE

### Railway.app Cron Jobs
```yaml
# railway.toml
[scripts]
  active_check = "node scrape-active-disasters-only.mjs"
  weekly_validation = "node scrape-validate-active.mjs"
  monthly_full = "node scrape-all-disasters-puppeteer.mjs"

[crons]
  active_check_mon = "0 6 * * 1"   # 6am Monday
  active_check_wed = "0 6 * * 3"   # 6am Wednesday  
  active_check_sat = "0 6 * * 6"   # 6am Saturday
  weekly_validation = "0 2 * * 0"  # 2am Sunday
  monthly_full = "0 1 1 * *"       # 1am on 1st of month
```

### Alternative: Using Node Cron Scheduler
```javascript
// scheduler.mjs - Single scheduler for all jobs
import cron from 'node-cron';

// Mon, Wed, Sat at 6am AEST
cron.schedule('0 6 * * 1,3,6', async () => {
  console.log('Running 3x weekly active disaster check');
  await import('./scrape-active-disasters-only.mjs');
}, {
  timezone: 'Australia/Sydney'
});

// Sunday 2am AEST
cron.schedule('0 2 * * 0', async () => {
  console.log('Running weekly validation');
  await import('./scrape-validate-active.mjs');
}, {
  timezone: 'Australia/Sydney'
});

// 1st of month at 1am AEST
cron.schedule('0 1 1 * *', async () => {
  console.log('Running monthly full scrape');
  await import('./scrape-all-disasters-puppeteer.mjs');
}, {
  timezone: 'Australia/Sydney'
});
```

## 8. AUDIT & COMPLIANCE

### Medicare Compliance Log
```sql
-- Log every telehealth check
CREATE TABLE telehealth_eligibility_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_id VARCHAR(255),
  patient_postcode VARCHAR(10),
  check_result VARCHAR(50), -- 'eligible', 'not_eligible', 'recently_ended'
  disaster_agrn VARCHAR(50),
  alert_shown BOOLEAN,
  alert_acknowledged BOOLEAN,
  checked_at TIMESTAMP DEFAULT NOW()
);
```

## 9. VISIBILITY PERIODS

- **Ended Disasters**: 30 days (CRITICAL)
- **LGA Removals**: 14 days (WARNING)
- **New Disasters**: 7 days (INFO)
- **Email Reminders**: Daily for first week, then weekly

## 10. IMPLEMENTATION PRIORITY

1. **IMMEDIATE**: Daily active disaster checker
2. **WEEK 1**: Alert system and database
3. **WEEK 2**: Dashboard integration
4. **WEEK 3**: Email notifications
5. **WEEK 4**: Full deployment on Railway

This system ensures:
- ✅ No practitioner misses a disaster ending
- ✅ Full audit trail for Medicare
- ✅ Proactive compliance management
- ✅ Clear visibility of all changes
- ✅ Reduced risk of $500,000 fines