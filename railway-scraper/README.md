# Disaster Scraper Worker

Autonomous Puppeteer scraper for DisasterAssist - Medicare compliance.

## Deploy to Railway

1. Push this folder to GitHub
2. Connect to Railway
3. Add environment variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - RUN_ON_STARTUP=true

## Endpoints

- `GET /health` - Health check
- `POST /sync` - Manual sync
- `POST /daily-sync` - Daily cron sync

## Automatic Daily Sync

Railway will call `/daily-sync` endpoint daily via cron.