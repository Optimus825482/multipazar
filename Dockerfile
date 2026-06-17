# ---- Build Stage ----
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run db:generate
RUN bun run build

# ---- Runtime Stage ----
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Build script zaten static + public klasorlerini standalone icine kopyaladi
COPY --from=builder /app/.next/standalone ./

# SQLite veritabani
COPY --from=builder /app/db ./db
COPY --from=builder /app/prisma ./prisma

# Prisma runtime engine (platform-specific, build imajindan kopyala)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Runtime'da schemayi senkronla
RUN cd /app && bunx prisma db push

EXPOSE 3000

CMD ["bun", "server.js"]
