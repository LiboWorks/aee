#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# AEE — Deploy / redeploy on EC2
# Usage:  ./scripts/deploy.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in values."
  exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building and starting containers"
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "==> Cleaning up old images"
docker image prune -f

echo "==> Deployment complete"
docker compose -f docker-compose.prod.yml ps
