# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build

# ── Production Stage ──────────────────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /app

# Only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline

COPY --from=build /app/dist ./dist

# Runtime uploads folder
RUN mkdir -p uploads

EXPOSE 5000

# Health check — hits the /api/health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Use dumb-init so Node receives SIGTERM properly (graceful shutdown)
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/cluster.js"]
