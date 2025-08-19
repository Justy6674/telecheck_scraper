#!/bin/bash

# RUN THIS LOCALLY FOR MEDICARE COMPLIANCE
# Government site blocks cloud IPs (403 Forbidden)

echo "🏥 MEDICARE COMPLIANCE SCRAPER - LOCAL EXECUTION"
echo "Running from residential IP to avoid 403 blocks..."

# Run the working Puppeteer scraper
node scrape-all-disasters-puppeteer.mjs

echo "✅ Scraping complete - data saved to Supabase"
echo "📊 Check dashboard for updated disaster counts"

# Schedule with cron:
# 0 */8 * * * cd /Users/jb-downscale/Downloads/disaster-check-au && ./run-local-scraper.sh