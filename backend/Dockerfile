FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN touch .env && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nomogreen pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache libstdc++ openssl \
    && addgroup -S nodejs \
    && adduser -S nestjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001
CMD ["node", "dist/src/main.js"]
