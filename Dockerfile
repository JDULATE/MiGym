# MiGym — single-service production Dockerfile.
# Builds the frontend AND runs the API server, which also serves the static files.
# Deploy to Railway.app, Render.com, Fly.io, or any Docker host.

FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY frontend/ .

# Exercise media (~140 MB) is not shipped in the image — pull it from the dataset CDN,
# same bases the mobile build uses (see build:mobile in frontend/package.json).
ENV VITE_IMG_BASE=https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/
ENV VITE_GIF_BASE=https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/

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
