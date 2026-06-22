#!/bin/bash
set +e

export DATABASE_URL="${DATABASE_URL:-file:/data/mulpaz.db}"

echo "[Startup] DATABASE_URL=$DATABASE_URL"
echo "[Startup] Calisan kullanici: $(id)"

# DB dizin/dosya yollarini hesapla
DB_FILE=$(echo "$DATABASE_URL" | sed 's|^file:||')
DB_DIR=$(dirname "$DB_FILE")

# Coolify named volume mount'unda sorun: mount edilmis dosyalarin sahipligi
# genelde root'a ait olur ve appuser yazamaz. Bu script, container basinda
# root olarak calistigi icin (USER appuser'a gecmeden once) sahipligi duzeltebilir.

# 1) Dizin yoksa olustur
if [ ! -d "$DB_DIR" ]; then
  echo "[Startup] $DB_DIR dizini yok, olusturuluyor..."
  mkdir -p "$DB_DIR"
fi

# 2) Dizin ve icindeki dosyalarin sahipligini appuser'a ver
# (Eger volume mount edilmemisse ve yeni olusturulduysa sahiplik dogru olur.
# Eger mount edilmisse, icindeki dosyalarin sahipligi root'a ait olabilir ve
# bu chown ile duzeltilebilir cunku su an root olarak calisiyoruz.)
if [ "$(id -u)" = "0" ]; then
  if id "appuser" &>/dev/null; then
    echo "[Startup] $DB_DIR sahipligi appuser'a veriliyor..."
    chown -R appuser:appgroup "$DB_DIR" 2>&1 | head -5 || true
  fi
fi

# 3) Dizin sahipligini ve yazma testini goster
ls -la "$DB_DIR" 2>&1 | head -10 || true

# Prisma CLI'yi proje node_modules/.bin uzerinden bul.
PRISMA_BIN="./node_modules/.bin/prisma"

if [ ! -x "$PRISMA_BIN" ]; then
  echo "[Startup] HATA: $PRISMA_BIN bulunamadi. Image build hatasi olabilir."
  exit 1
fi

# Migration veya db push
if [ -d "/app/prisma/migrations" ] && [ -n "$(ls -A /app/prisma/migrations 2>/dev/null | grep -v migration_lock.toml)" ]; then
  echo "[Startup] Prisma migrate deploy calistiriliyor..."
  $PRISMA_BIN migrate deploy 2>&1
  MIGRATE_EXIT=$?
  if [ $MIGRATE_EXIT -ne 0 ]; then
    echo "[Startup] UYARI: migrate deploy basarisiz ($MIGRATE_EXIT), db push deneniyor..."
    $PRISMA_BIN db push --skip-generate 2>&1
  fi
else
  echo "[Startup] Prisma migrations bulunamadi; guvenli db push fallback calistiriliyor..."
  $PRISMA_BIN db push --skip-generate 2>&1
fi

echo "[Startup] Next.js uygulamasi baslatiliyor (appuser olarak)..."
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# appuser olarak gec ve server'i baslat. exec ile PID 1 olarak degistiriyoruz
# ki container sinyal yonetimi (SIGTERM, vb.) dogru calissin.
if [ "$(id -u)" = "0" ] && id "appuser" &>/dev/null; then
  exec runuser -u appuser -- bun server.js
else
  exec bun server.js
fi
