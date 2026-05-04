FROM node:22-alpine AS base
RUN npm install -g pnpm

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN pnpm install --frozen-lockfile --filter @odoo-portal/api...

# Build
FROM deps AS build
COPY apps/api ./apps/api
COPY packages/types ./packages/types
COPY tsconfig.base.json ./
RUN pnpm --filter @odoo-portal/api build

# Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid  1001 hono
USER hono

EXPOSE 3001
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
