#!/bin/bash
set +e

export PGDATA=/var/lib/postgresql/data
export POSTGRES_DB=mulpaz
export POSTGRES_USER=mulpaz
export POSTGRES_PASSWORD=mulpaz

# PostgreSQL bin dizinini dinamik bul
PG_BIN=$(find /usr/lib/postgresql -name initdb -type f 2>/dev/null | head -1 | xargs dirname)
if [ -z "$PG_BIN" ]; then
  echo "[Startup] HATA: PostgreSQL binary bulunamadi!"
  ls /usr/lib/postgresql/ 2>/dev/null
  # Servis dosyasindan dene
  PG_BIN=$(dpkg -L postgresql 2>/dev/null | grep bin/initdb | head -1 | xargs dirname)
fi
echo "[Startup] PostgreSQL bin: $PG_BIN"

# PostgreSQL basladi mi kontrol et
if su - postgres -c "export PATH=$PG_BIN:\$PATH && pg_isready -q" 2>/dev/null; then
  echo "[Startup] PostgreSQL zaten calisiyor, atlaniyor."
else
  echo "[Startup] PostgreSQL baslatiliyor..."

  # Data dizini
  mkdir -p $PGDATA
  chown -R postgres:postgres $PGDATA

  # initdb (ilk calistirmada)
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "[Startup] initdb calistiriliyor..."
    su postgres -c "export PATH=$PG_BIN:\$PATH && initdb -D $PGDATA --auth=trust --username=postgres"

    # pg_hba.conf - parolasiz erisim
    echo "host all all 127.0.0.1/32 trust" >> $PGDATA/pg_hba.conf
    echo "host all all ::1/128 trust" >> $PGDATA/pg_hba.conf
  fi

  # PostgreSQL baslat
  echo "[Startup] pg_ctl start..."
  su postgres -c "export PATH=$PG_BIN:\$PATH && pg_ctl -D $PGDATA -l /var/log/postgresql.log start"

  # Hazir olana kadar bekle
  for i in $(seq 1 30); do
    if su postgres -c "export PATH=$PG_BIN:\$PATH && pg_isready -q" 2>/dev/null; then
      echo "[Startup] PostgreSQL hazir!"
      break
    fi
    echo "[Startup] PostgreSQL bekleniyor... ($i/30)"
    sleep 1
  done

  # Kullanici ve veritabani
  echo "[Startup] Kullanici/DB kontrol..."
  su postgres -c "export PATH=$PG_BIN:\$PATH && psql -c \"CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD' SUPERUSER;\"" 2>/dev/null || echo "  Kullanici zaten var"
  su postgres -c "export PATH=$PG_BIN:\$PATH && psql -c \"CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;\"" 2>/dev/null || echo "  Veritabani zaten var"
fi

# Prisma migrate
echo "[Startup] Prisma migration..."
cd /app
DATABASE_URL=postgresql://mulpaz:mulpaz@localhost:5432/mulpaz npx prisma db push --accept-data-loss 2>&1

# Uygulama
echo "[Startup] Next.js uygulamasi baslatiliyor..."
export DATABASE_URL=postgresql://mulpaz:mulpaz@localhost:5432/mulpaz
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

exec bun server.js
