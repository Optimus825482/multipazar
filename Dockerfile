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
# Bu, Next.js'in `next build` + standalone output icin gerekli olan ek adimdir.
# copy-standalone-assets.mjs build sonrasi host'ta calisir; Dockerfile icinde
# inline yapiyoruz ki build pipeline'i tek stage olsun.
RUN if [ -d .next/static ]; then mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static; fi && \
    if [ -d public ]; then cp -r public .next/standalone/public; fi

# ---- Stage 2: Runtime ----
FROM oven/bun:1-slim AS runner

# Guvenlik: Root olarak calistirma. appuser olustur.
# Bun slim Debian tabanli; groupadd/useradd mevcut.
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

# SQLite DB volume mount noktasi. appuser yazabilsin.
# Coolify named volume mount'unda sahiplik sorunlarini onler.
RUN mkdir -p /data && chown -R appuser:appgroup /data

# Build'den standalone ciktiyi kopyala (.next/static + public zaten icinde)
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./

# Prisma runtime (client + CLI). Standalone output zaten production
# dependency'leri minimize eder; biz yine de acikca ekliyoruz:
# - node_modules/.prisma + @prisma: PrismaClient icin (runtime import)
# - node_modules/prisma: Prisma CLI icin (migrate deploy / db push)
# - node_modules/.bin: CLI binary'leri (prisma, ...) icin
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.bin ./node_modules/.bin

# Startup script
COPY --chown=appuser:appgroup scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Tum app dizininin sahipligini appuser'a ver
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["/app/start.sh"]
