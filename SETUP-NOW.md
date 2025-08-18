# 🚨 IMMEDIATE SETUP - MAKE IT WORK NOW

## 🎯 WHAT THIS DOES
- Scrapes ALL 760+ disasters from DisasterAssist.gov.au
- Extracts ALL affected LGAs (not just one)
- Updates frontend tiles with real numbers
- Sets up daily/weekly automated scraping
- Provides admin manual trigger

---

## 📋 STEP-BY-STEP SETUP

### STEP 1: Run Full Import NOW (30-45 minutes)
```bash
# Run the complete scraper
node scrape-all-disasters-now.mjs
```
This will:
- Visit all 38+ pages of disasters
- Click into each disaster detail page
- Extract all LGAs, assistance programs, dates
- Save everything to Supabase
- Show progress in terminal

**Expected output:**
```
📊 Total disasters found: 760+
✅ Successfully saved: 750+
❌ Errors: <10
```

### STEP 2: Deploy Railway Scraper for Automation

#### Update Railway Service
1. Go to Railway dashboard
2. Update `/railway-scraper-service/index.js` with new extraction logic
3. Deploy changes
4. Set environment variables:
   ```
   SUPABASE_URL=https://sfbohkqmykagkdmggcxw.supabase.co
   SUPABASE_KEY=[your-key]
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
   ```

#### Schedule Automated Runs
In Railway:
1. Go to Settings → Cron
2. Add schedule:
   - **Daily**: `0 6 * * *` (6 AM daily)
   - **Weekly**: `0 6 * * 1` (Monday 6 AM)
   - **Cost**: ~$0.50 per run

### STEP 3: Create Admin Manual Trigger

Deploy the Edge Function:
```bash
npx supabase functions deploy trigger-scraper
```

Add to frontend admin panel:
```jsx
// Admin component
const triggerScraper = async () => {
  const { data, error } = await supabase.functions.invoke('trigger-scraper');
  if (data.success) {
    toast.success('Scraper started! Check back in 30-45 minutes.');
  }
};

<Button onClick={triggerScraper}>
  🔄 Manual Scrape Now
</Button>
```

### STEP 4: Update Frontend Tiles

The tiles will auto-update using `statsService.ts`:
```javascript
// Already created - just import and use
import { getDashboardStats } from '@/services/statsService';

// In your component
const stats = await getDashboardStats();
// Returns: { activeDisasters, affectedLGAs, statesAffected, verificationsToday }
```

### STEP 5: Test Everything Works

#### Test Postcode Search:
```
Postcode: 2337 (Armidale)
Should return: NSW Severe Weather Event (AGRN-1216)

Postcode: 4000 (Brisbane)  
Should return: Cyclone Alfred (AGRN-1195)

Postcode: 3000 (Melbourne)
Should return: Any VIC disasters
```

#### Verify Frontend Shows:
- ✅ Active Disasters: 200+ (real number)
- ✅ Affected LGAs: 400+ (real number)
- ✅ States Affected: 6-8
- ✅ Verifications Today: (increments with use)

---

## 💰 COST BREAKDOWN

### Scraping Costs:
- **Initial Full Import**: ~$2 (one-time)
- **Daily Scrapes**: ~$0.50/day = $15/month
- **Weekly Scrapes**: ~$0.50/week = $2/month
- **Manual Triggers**: ~$0.50 each

### Recommended: DAILY SCRAPING
- Cost: $15/month
- Ensures data is always current
- Catches new disasters within 24 hours
- Critical for healthcare compliance

---

## 🔧 TROUBLESHOOTING

### If scraper fails:
1. Check Railway logs
2. Verify Chrome is installed: `ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable`
3. Increase timeout if needed

### If no LGAs extracted:
1. Check page structure hasn't changed
2. Update extraction logic if needed
3. Test with `scrape-raw-disaster.mjs` first

### If database not updating:
1. Check Supabase service key is correct
2. Verify table exists: `disaster_declarations`
3. Check RLS policies allow inserts

---

## ✅ SUCCESS CHECKLIST

After setup, verify:
- [ ] 760+ disasters in database
- [ ] Frontend tiles show real numbers
- [ ] Postcode search returns correct disasters
- [ ] Each disaster has multiple LGAs (not just one)
- [ ] Verification URLs work
- [ ] Admin can trigger manual scrape
- [ ] Daily/weekly scraping scheduled

---

## 🚀 GO LIVE CHECKLIST

1. **Run full import** ✓
2. **Deploy Railway scraper** ✓
3. **Set up scheduling** ✓
4. **Test postcodes** ✓
5. **Verify frontend** ✓
6. **Deploy to production** → www.telecheck.com.au

---

## 📞 MONITORING

Set up alerts for:
- Scraper failures (Railway alerts)
- Low disaster count (<100)
- High error rate (>10%)
- Slow response times (>1s)

---

**READY TO GO!** Run `node scrape-all-disasters-now.mjs` to start!