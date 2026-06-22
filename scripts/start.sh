#!/bin/bash
set +e

export DATABASE_URL="${DATABASE_URL:-file:/data/mulpaz.db}"

# Prisma CLI'yi proje node_modules/.bin uzerinden bul.
# Bu, network'e bagimliligi kaldirir ve build zamaninda belirlenen
# versiyonun kullanilmasini garanti eder.
PRISMA_BIN="./node_modules/.bin/prisma"

if [ ! -x "$PRISMA_BIN" ]; then
  echo "[Startup] HATA: $PRISMA_BIN bulunamadi. Image build hatasi olabilir."
  exit 1
fi

if [ -d "/app/prisma/migrations" ] && [ -n "$(ls -A /app/prisma/migrations 2>/dev/null | grep -v migration_lock.toml)" ]; then
  echo "[Startup] Prisma migrate deploy calistiriliyor..."
  $PRISMA_BIN migrate deploy 2>&1
else
  echo "[Startup] Prisma migrations bulunamadi; guvenli db push fallback calistiriliyor..."
  $PRISMA_BIN db push --skip-generate 2>&1
fi

echo "[Startup] Next.js uygulamasi baslatiliyor..."
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

exec bun server.js
