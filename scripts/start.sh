#!/bin/bash
set -e

export PGDATA=/var/lib/postgresql/data
export POSTGRES_DB=mulpaz
export POSTGRES_USER=mulpaz
export POSTGRES_PASSWORD=mulpaz

echo "[Startup] PostgreSQL baslatiliyor..."

# PostgreSQL data dizinini olustur
mkdir -p $PGDATA
chown -R postgres:postgres $PGDATA

# initdb (ilk calistirmada)
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[Startup] initdb calistiriliyor..."
  su - postgres -c "initdb -D $PGDATA --auth=trust --username=postgres"
  
  # pg_hba.conf'u ayarla (parolasiz erisim)
  echo "host all all 127.0.0.1/32 trust" >> $PGDATA/pg_hba.conf
  echo "host all all ::1/128 trust" >> $PGDATA/pg_hba.conf
fi

# PostgreSQL'i baslat
su - postgres -c "pg_ctl -D $PGDATA -l /var/log/postgresql.log start"

# PostgreSQL'in hazir olmasini bekle
for i in $(seq 1 30); do
  if su - postgres -c "pg_isready -q" 2>/dev/null; then
    echo "[Startup] PostgreSQL hazir!"
    break
  fi
  echo "[Startup] PostgreSQL bekleniyor... ($i/30)"
  sleep 1
done

# Kullanici ve veritabanini olustur
echo "[Startup] Kullanici ve veritabani kontrol ediliyor..."
su - postgres -c "psql -c \"CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD' SUPERUSER;\"" 2>/dev/null || echo "  Kullanici zaten var"
su - postgres -c "psql -c \"CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;\"" 2>/dev/null || echo "  Veritabani zaten var"

# Migrate
echo "[Startup] Prisma migration calistiriliyor..."
cd /app
DATABASE_URL=postgresql://mulpaz:mulpaz@localhost:5432/mulpaz npx prisma db push --accept-data-loss 2>&1

# Uygulamayi baslat
echo "[Startup] Next.js uygulamasi baslatiliyor..."
export DATABASE_URL=postgresql://mulpaz:mulpaz@localhost:5432/mulpaz
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

exec bun server.js
