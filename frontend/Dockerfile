# ── Build stage ──
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

# Ensure public/ exists (Next.js standalone expects it)
RUN mkdir -p public

# NEXT_PUBLIC_ env vars must be set at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Production stage ──
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
