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

# ---- Stage 2: Runtime ----
FROM oven/bun:1-slim AS runner

# Guvenlik: Root olarak calistirma. Bun slim zaten kullaniciya sahip degil,
# ama app klasorunu belirli bir kullaniciya ait yapmak iyi pratik.
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app appuser
WORKDIR /app

# Build'den standalone ciktiyi kopyala
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./

# Prisma runtime (sadece client, CLI degil)
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI runtime icin
RUN bun add -g prisma@6.11.1 && chown -R appuser:appgroup /usr/local/share/.bun

# Startup script
COPY --chown=appuser:appgroup scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

USER appuser

EXPOSE 3000

CMD ["/app/start.sh"]
