FROM ghcr.io/puppeteer/puppeteer:22.10.0

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Run as non-root
USER pptruser

EXPOSE 8080

CMD ["node", "server.js"]