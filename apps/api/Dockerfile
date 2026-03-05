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

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
