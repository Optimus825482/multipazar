#!/bin/bash
set +e

echo "[Startup] Prisma db push calistiriliyor..."
export DATABASE_URL=file:./mulpaz.db
bunx prisma@6.11.1 db push --accept-data-loss 2>&1

echo "[Startup] Next.js uygulamasi baslatiliyor..."
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

exec bun server.js
