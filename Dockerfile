# syntax=docker/dockerfile:1

# ---- Build stage: install everything, generate the Prisma client, compile ----
FROM node:22-alpine AS build
WORKDIR /app
# Husky installs Git hooks; there is no Git repository in the image.
ENV HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Prisma 7 does not generate automatically; the client lands in the configured output folder.
# Always generate the Prisma client fresh. `generated/` sits outside `src` and is also excluded by
# .dockerignore; the rm makes sure no stale copy can ever be used.
# The URL is a throwaway value so prisma.config.ts can load; generate never connects.
RUN rm -rf generated \
  && DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
RUN npm run build
# The generated client is outside src, so the app is emitted at dist/src/main.js. Fail the build
# here, not at startup, if that ever changes.
RUN test -f dist/src/main.js
# Keep only production dependencies for the runtime image.
RUN npm prune --omit=dev

# ---- Runtime stage: small, non-root, no secrets ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

ARG APP_VERSION=unknown
ENV APP_VERSION=${APP_VERSION}

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 8080

# Uses the PORT variable Render provides, falling back to 8080.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/health" >/dev/null || exit 1

CMD ["node", "dist/src/main.js"]