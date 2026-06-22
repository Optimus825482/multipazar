#!/bin/bash
set +e

export DATABASE_URL="${DATABASE_URL:-file:/data/mulpaz.db}"

if [ -d "/app/prisma/migrations" ]; then
  echo "[Startup] Prisma migrate deploy calistiriliyor..."
  bunx prisma@6.11.1 migrate deploy 2>&1
else
  echo "[Startup] Prisma migrations bulunamadi; guvenli db push fallback calistiriliyor..."
  bunx prisma@6.11.1 db push 2>&1
fi

echo "[Startup] Next.js uygulamasi baslatiliyor..."
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

exec bun server.js
