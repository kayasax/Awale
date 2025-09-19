## Multi-stage Dockerfile for @awale/server
## Build context is repository root (invoke: docker build -f packages/server/Dockerfile .)

FROM node:20-alpine AS build
WORKDIR /app

# Copy root manifests and shared TypeScript config
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy package manifests & tsconfig files for workspaces we need (core, shared, server)
COPY packages/core/package*.json packages/core/
COPY packages/core/tsconfig.json packages/core/
COPY packages/shared/package*.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/server/package*.json packages/server/
COPY packages/server/tsconfig.json packages/server/

# Install all workspace dependencies (dev deps included for compilation)
RUN npm install

# Copy sources
COPY packages/core/src packages/core/src
COPY packages/shared/src packages/shared/src
COPY packages/server/src packages/server/src

# Build only required workspaces (shared, core, server) to avoid missing bot workspace
RUN npm run build -w @awale/shared \
	&& npm run build -w @awale/core \
	&& npm run build -w @awale/server \
	&& npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy entire built workspace to preserve workspace symlinks and path mapping
COPY --from=build /app /app

EXPOSE 8080

# Use correct path to compiled server entry point
CMD ["node", "packages/server/dist/server/src/index.js"]
