# 🚀 DEPLOY TO RAILWAY - MAKE IT AUTONOMOUS NOW

## You have 2 options:

---

## OPTION 1: DEPLOY DIRECTLY (EASIEST - 5 MINUTES)

### Step 1: Push to YOUR GitHub

```bash
# From disaster-check-au folder
cd railway-scraper
git init
git add .
git commit -m "Disaster scraper for Medicare compliance"

# Create new repo on GitHub.com called "disaster-scraper"
# Then:
git remote add origin https://github.com/YOUR_USERNAME/disaster-scraper.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to: https://railway.app
2. Click **"New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select your `disaster-scraper` repo
5. Railway auto-detects Dockerfile ✅

### Step 3: Add Environment Variables in Railway

Click on your deployment → **Variables** tab → Add these:

```
SUPABASE_URL=https://sfbohkqmykagkdmggcxw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y
RUN_ON_STARTUP=true
PORT=8080
```

### Step 4: Get Your URL

After deployment, Railway gives you:
```
https://disaster-scraper-production.up.railway.app
```

Test it:
```bash
curl https://disaster-scraper-production.up.railway.app/health
```

---

## OPTION 2: USE MY PRE-BUILT TEMPLATE (INSTANT)

1. Click this link: [Deploy on Railway](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/disaster-scraper)
2. Add your Supabase credentials
3. Deploy!

---

## 🔄 SETTING UP DAILY SYNC

### In Railway:

1. Go to your project → **Settings** → **Cron**
2. Add cron job:
   - Schedule: `0 2 * * *` (2 AM daily)
   - Command: `curl -X POST https://YOUR-APP.up.railway.app/daily-sync`

### OR Use Supabase Cron:

```sql
-- Run in Supabase SQL Editor
SELECT cron.schedule(
  'daily-disaster-sync',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT net.http_post(
    'https://YOUR-RAILWAY-APP.up.railway.app/daily-sync',
    '{}',
    headers:='{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

---

## ✅ VERIFY IT'S WORKING

### 1. Check Railway Logs
```
Railway Dashboard → Your App → Logs
```
Should see:
```
🚀 Disaster Scraper running on port 8080
📊 Supabase: Connected
Running initial sync...
[startup] Starting disaster scrape...
[startup] Found 120 disasters
[startup] Saved 120 disasters to database
```

### 2. Check Database
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM disaster_declarations;
-- Should return 120+ disasters

SELECT * FROM data_import_logs 
WHERE import_type = 'railway_disaster_sync'
ORDER BY created_at DESC;
-- Should show sync logs
```

### 3. Test Manual Sync
```bash
curl -X POST https://YOUR-APP.up.railway.app/sync
```

---

## 🚨 TROUBLESHOOTING

### "Puppeteer failed to launch"
- Railway automatically handles Chrome installation
- Check logs for specific error

### "Database not updating"
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check Railway logs for errors

### "App crashes"
- Increase memory in Railway settings
- Check if Chrome dependencies installed

---

## 🎯 WHAT HAPPENS NEXT

Once deployed:
1. **Immediately**: Scrapes all disasters on startup
2. **Daily at 2 AM**: Auto-syncs latest disasters
3. **Frontend**: Shows real disaster data
4. **Medicare**: Doctors can check eligibility

---

## NEED HELP?

1. Railway Support: https://railway.app/help
2. Check logs: Railway Dashboard → Logs
3. Test endpoint: `curl YOUR-URL/health`

**DEPLOY THIS NOW - IT TAKES 5 MINUTES!**