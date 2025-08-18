# 🚨 CRITICAL: Deployment Instructions for Autonomous Disaster Scraping

## Current Status: ❌ NOT AUTONOMOUS

The Puppeteer scrapers **ONLY work locally** right now. To make this autonomous, follow these steps:

---

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│                 │────▶│ Scraper Worker   │────▶│  DisasterAss │
│ Supabase Edge   │     │ (Node+Puppeteer) │     │  ist.gov.au  │
│    Function     │◀────│   Railway.app    │◀────│   (760+)     │
└─────────────────┘     └──────────────────┘     └──────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│ Supabase DB     │     │ Direct DB Writes │
│ (Declarations)  │◀────│  (Service Key)   │
└─────────────────┘     └──────────────────┘
```

---

## 📋 Step-by-Step Deployment

### Step 1: Deploy Scraper Worker to Railway.app

1. **Create Railway Account**: https://railway.app

2. **Deploy from GitHub**:
   ```bash
   cd scraper-worker
   git init
   git add .
   git commit -m "Disaster scraper worker"
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

3. **In Railway Dashboard**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repo
   - Railway auto-detects Node.js

4. **Add Environment Variables** in Railway:
   ```
   SUPABASE_URL=https://sfbohkqmykagkdmggcxw.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (your service role key)
   PORT=8080
   MAX_CONCURRENCY=2
   ```

5. **Get Deployment URL**:
   - Railway provides: `https://your-app.up.railway.app`
   - Copy this URL

### Step 2: Configure Supabase Edge Functions

1. **Add Secret in Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/sfbohkqmykagkdmggcxw
   - Navigate: Settings → Edge Functions → Secrets
   - Add: `SCRAPER_WORKER_URL = https://your-app.up.railway.app`

2. **Deploy Edge Function**:
   ```bash
   npx supabase functions deploy daily-disaster-sync
   ```

### Step 3: Set Up Daily Cron Job

**Option A: Supabase Cron (Recommended)**
```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'daily-disaster-sync',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT net.http_post(
    'https://sfbohkqmykagkdmggcxw.supabase.co/functions/v1/daily-disaster-sync',
    '{}',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

**Option B: External Cron Service**
- Use: cron-job.org, EasyCron, or GitHub Actions
- Call: `POST https://sfbohkqmykagkdmggcxw.supabase.co/functions/v1/daily-disaster-sync`
- Header: `Authorization: Bearer YOUR_ANON_KEY`

### Step 4: Test the Setup

```bash
# Test scraper worker directly
curl https://your-app.up.railway.app/health

# Test via Supabase Edge Function
curl -X POST https://sfbohkqmykagkdmggcxw.supabase.co/functions/v1/daily-disaster-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## 🔧 Alternative Deployment Options

### Render.com
```yaml
# render.yaml
services:
  - type: web
    name: disaster-scraper
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: SUPABASE_URL
        value: YOUR_URL
      - key: SUPABASE_SERVICE_ROLE_KEY
        value: YOUR_KEY
```

### DigitalOcean App Platform
```yaml
# app.yaml
name: disaster-scraper
services:
- name: worker
  github:
    repo: YOUR_REPO
    branch: main
    deploy_on_push: true
  build_command: npm install
  run_command: node server.js
  envs:
  - key: SUPABASE_URL
    value: YOUR_URL
  - key: SUPABASE_SERVICE_ROLE_KEY
    value: YOUR_KEY
```

### Self-Hosted VPS
```bash
# On Ubuntu/Debian VPS
apt update
apt install -y nodejs npm chromium-browser

# Clone and setup
git clone YOUR_REPO
cd scraper-worker
npm install

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name disaster-scraper
pm2 save
pm2 startup
```

---

## 🏥 Medicare Compliance Features

Once deployed, the system will:
- ✅ Scrape all 760+ disasters daily
- ✅ Open EVERY disaster page for full details
- ✅ Track all affected LGAs with dates
- ✅ Maintain complete audit trail
- ✅ Store practitioner access logs
- ✅ Enable historical eligibility checks

---

## 🚨 CRITICAL NOTES

1. **Service Role Key**: NEVER expose this in frontend code
2. **Rate Limiting**: Scraper has built-in delays to respect gov.au
3. **Monitoring**: Check Railway/Render logs for errors
4. **Backup**: JSON files saved to worker container
5. **Scaling**: Increase MAX_CONCURRENCY carefully (max 4)

---

## 📊 Monitoring

### Check Sync Status
```javascript
// In your app
const checkSyncStatus = async () => {
  const { data, error } = await supabase
    .from('data_import_logs')
    .select('*')
    .eq('import_type', 'daily_disaster_sync')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  console.log('Last sync:', data);
};
```

### View in Supabase Dashboard
- Table Editor → `disaster_declarations` (main data)
- Table Editor → `disaster_lgas` (LGA mappings)
- Table Editor → `disaster_history` (audit trail)
- Table Editor → `data_import_logs` (sync logs)

---

## ❓ Troubleshooting

**"Scraper worker not configured"**
- Deploy worker first, then add SCRAPER_WORKER_URL secret

**"Failed to launch browser"**
- Ensure Dockerfile includes Chrome dependencies
- Check Railway/Render logs

**"Rate limit exceeded"**
- Reduce MAX_CONCURRENCY to 1
- Add longer delays between requests

**"Missing disasters"**
- Check if DisasterAssist HTML changed
- Update selectors in server.js

---

## 🎯 Success Criteria

You'll know it's working when:
1. `data_import_logs` shows successful daily syncs
2. `disaster_declarations` has 760+ records
3. `disaster_lgas` has all affected areas
4. Frontend shows "Last sync: today's date"

---

## 📞 Support

- **Railway Issues**: https://railway.app/help
- **Supabase Issues**: https://supabase.com/docs
- **Puppeteer Issues**: https://github.com/puppeteer/puppeteer

**DEPLOY THIS TODAY - LIVES DEPEND ON ACCURATE MEDICARE DATA**