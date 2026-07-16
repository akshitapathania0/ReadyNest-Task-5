# backend/Dockerfile
# Render can auto-detect Node.js without a Dockerfile,
# but this gives you more control over the Node version and build steps.

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Build TypeScript
COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output + Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Render injects PORT as an env var; default 10000
ENV PORT=10000
EXPOSE 10000

# Run migrations then start (safe — Prisma migrate deploy is idempotent)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
