#!/bin/bash
set +e

echo "[Startup] Next.js uygulamasi baslatiliyor..."
export DATABASE_URL=file:./mulpaz.db
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

exec bun server.js
