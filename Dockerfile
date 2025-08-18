# Use official Puppeteer image which includes Chrome
FROM ghcr.io/puppeteer/puppeteer:22.0.0

# Skip Puppeteer download since Chrome is pre-installed
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
USER pptruser

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "index.js"]