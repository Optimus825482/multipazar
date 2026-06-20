# ---- Multi-stage Build ----
# Tek container: Next.js + SQLite

# ---- Stage 1: Builder ----
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN bun install

COPY . .
ENV DATABASE_URL=file:./mulpaz.db
RUN bun run db:generate
RUN bun run build

# ---- Stage 2: Runtime ----
FROM oven/bun:1-slim AS runner

# Puppeteer / Chromium icin gerekli bagimliliklar
RUN apt-get update && apt-get install -y chromium --no-install-recommends && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Build'den standalone çıktıyı kopyala
COPY --from=builder /app/.next/standalone ./

# Prisma runtime (sadece client, CLI degil)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI'yi runtime'da calistirmak icin kur
RUN bun add -g prisma@6.11.1

# Startup script
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
