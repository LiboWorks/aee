# ── Build stage ──
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

COPY . .

RUN npm run build

# Keep only runtime dependencies for the production image.
RUN npm prune --omit=dev && npm cache clean --force

# ── Production stage ──
FROM node:20-slim

# Install system deps needed by Playwright/Chromium and bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libasound2 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
    libcairo2 libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 \
    libxfixes3 libxkbcommon0 libxrandr2 libxrender1 libxshmfence1 libxss1 \
    libxtst6 \
    ca-certificates fonts-liberation wget curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Install Playwright Chromium browser
RUN npx playwright install chromium

COPY --from=builder /app/dist ./dist

EXPOSE 4000

# Start the server
CMD ["node", "dist/src/main"]
