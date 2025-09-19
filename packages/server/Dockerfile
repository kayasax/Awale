# Multi-stage build for @awale/server
FROM node:20-alpine AS build
WORKDIR /app
# Copy root manifests for workspace install (if using npm workspaces)
COPY ../../package.json ../../package-lock.json ./
COPY ../../packages ./packages
WORKDIR /app/packages/server
RUN npm ci --omit=dev && npm install --only=dev typescript
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS runtime
WORKDIR /srv
ENV NODE_ENV=production
COPY --from=build /app/packages/server/dist ./dist
COPY --from=build /app/packages/server/package.json ./package.json
# Only production dependencies
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
EXPOSE 8080
CMD ["node", "dist/index.js"]
