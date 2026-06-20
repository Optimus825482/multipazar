#!/bin/bash
set +e

echo "[Startup] Prisma db push calistiriliyor..."
cd /app
DATABASE_URL=file:./mulpaz.db npx prisma db push --accept-data-loss 2>&1

echo "[Startup] Next.js uygulamasi baslatiliyor..."
export DATABASE_URL=file:./mulpaz.db
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

exec bun server.js
