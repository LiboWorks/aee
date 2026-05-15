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
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
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
