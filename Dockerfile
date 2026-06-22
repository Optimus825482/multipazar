# ---- Multi-stage Build ----
# Tek container: Next.js + SQLite (Udemy/Puppeteer kaldirildi)

# ---- Stage 1: Builder ----
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
ENV DATABASE_URL=file:./mulpaz.db
RUN bun run db:generate
RUN bun run build

# Standalone build sonrasi static + public klasorlerini standalone icine kopyala.
RUN if [ -d .next/static ]; then mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static; fi && \
    if [ -d public ]; then cp -r public .next/standalone/public; fi

# ---- Stage 2: Runtime ----
FROM oven/bun:1-slim AS runner

# Guvenlik: appuser olustur (sahiplik duzeltme sonrasi server appuser olarak calisacak).
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

# tini: PID 1 zombie reaper + sinyal yonetimi. Container'in temiz baslatilmasi icin.
# Coolify/docker compose ile uyumlu.
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build'den standalone ciktiyi kopyala
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./

# Prisma runtime (client + CLI)
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.bin ./node_modules/.bin

# Startup script (root olarak calisacak - sahiplik duzeltmesi icin)
COPY --chown=root:root scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Tum app dizininin sahipligini appuser'a ver
RUN chown -R appuser:appgroup /app

# NOT: USER appuser'a gecmiyoruz; start.sh root olarak baslar ve sahiplik
# duzeltmeleri yaptiktan sonra `exec bun server.js` ile appuser olarak gecer.
# Bu, Coolify named volume mount'undaki dosya sahipligi sorunlarini cozer
# (mount edilmis dosyalarin sahplik bilgisi mount sirasinda host'tan gelir
# ve Docker build sirasindaki chown ile degistirilemez).

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/start.sh"]
