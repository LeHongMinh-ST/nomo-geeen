FROM node:22-alpine AS base

RUN corepack enable \
    && corepack prepare pnpm@10.17.1 --activate \
    && pnpm config set store-dir /pnpm/store
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=nomogreen-backend-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN touch .env \
    && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nomogreen pnpm build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache libstdc++ openssl \
    && addgroup -S nodejs \
    && adduser -S nestjs -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts
USER nestjs

EXPOSE 3001
CMD ["node", "dist/src/main.js"]
