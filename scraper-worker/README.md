# Disaster Scraper Worker

Autonomous Puppeteer scraper service for DisasterAssist data collection.

## 🚀 Deployment Options

### Option 1: Railway.app (Easiest)
1. Fork this repository
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select this repository
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Deploy!

### Option 2: Render.com
1. Create new Web Service
2. Connect GitHub repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables

### Option 3: DigitalOcean App Platform
1. Create new App
2. Choose GitHub source
3. Configure environment variables
4. Deploy

### Option 4: Local Docker
```bash
docker build -t disaster-scraper .
docker run -p 8080:8080 --env-file .env disaster-scraper
```

## 📊 API Endpoints

### Start Full Sync
```bash
POST /sync/disasters
{
  "immediate": true  // Save to DB as we go
}
```

### Check Status
```bash
GET /sync/status/{jobId}
```

### Health Check
```bash
GET /health
```

## 🔧 Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (not anon key!)
- `PORT`: Port to run on (default 8080)
- `MAX_CONCURRENCY`: Max parallel browser tabs (default 2)

## 🏥 Medicare Compliance

This scraper collects:
- All 760+ disaster declarations
- Every affected LGA per disaster
- Start/end dates for eligibility
- Full audit trail for compliance

## 📅 Daily Sync

Set up a cron job to call `/sync/disasters` daily:
- Railway: Use Railway Cron
- Render: Use Render Cron Jobs
- DigitalOcean: Use Scheduled Functions

## 🔒 Security

- Uses service role key for direct DB writes
- Rate limits built in
- Respects robots.txt
- User agent rotation