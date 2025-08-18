# 🔍 WHERE TO FIND YOUR RAILWAY URL

## Method 1: Railway Dashboard
1. Go to: https://railway.app/project/1565eef5-3e68-4940-955a-6a2938d5fe79
2. Click on your service (the box with your app name)
3. Click **Settings** tab
4. Scroll to **Networking**
5. Your URL is under **Public Domain**

![Railway URL Location](https://i.imgur.com/railway-url-location.png)

## Method 2: Railway CLI
```bash
# Install Railway CLI
brew install railway

# Login
railway login

# Link to your project
railway link 1565eef5-3e68-4940-955a-6a2938d5fe79

# Get domain
railway domain
```

## Method 3: If No URL Exists Yet

### You'll see "No domain configured"

Click **"Generate Domain"** button

Railway will create:
```
https://disaster-scraper-production-xyz123.up.railway.app
```

## What Each Part Means:
- `disaster-scraper` = Your service name
- `production` = Environment
- `xyz123` = Random string
- `up.railway.app` = Railway's domain

## Still Can't Find It?

### Check if service is deployed:
1. Look for green checkmark ✅ on service
2. Check Deployments tab for "Success"
3. If red X or building, wait for deployment

### No service at all?
You need to connect GitHub first:
1. Click "+ New" in Railway
2. Select "GitHub Repo"
3. Choose your repo
4. Wait for build
5. Then generate domain

## Common Railway URLs:
- `https://myapp-production.up.railway.app`
- `https://myapp.railway.app`
- `https://myapp-staging-abc123.up.railway.app`

## Once You Find It:

Test it works:
```bash
curl https://YOUR-URL.railway.app/health
```

Should return:
```json
{"status":"healthy"}
```