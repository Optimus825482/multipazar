# ---- Multi-stage Build ----
# Tek container: Next.js + PostgreSQL birlikte

# ---- Stage 1: Builder ----
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
ENV DATABASE_URL=postgresql://mulpaz:mulpaz@localhost:5432/mulpaz
RUN bun run db:generate
RUN bun run build

# ---- Stage 2: Runtime ----
FROM oven/bun:1-slim AS runner

# PostgreSQL kurulumu
RUN apt-get update -qq && \
    apt-get install -y -qq postgresql postgresql-client && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build'den standalone çıktıyı kopyala
COPY --from=builder /app/.next/standalone ./

# Prisma runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Startup script
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
