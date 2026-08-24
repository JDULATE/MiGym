# MiGym — single-service production Dockerfile.
# Builds the frontend AND runs the API server, which also serves the static files.
# Deploy to Railway.app, Render.com, Fly.io, or any Docker host.

FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY frontend/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY api/package.json api/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY api/server.js .

# serve the built frontend from the API server
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000
VOLUME /data

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
