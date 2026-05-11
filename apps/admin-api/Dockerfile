# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.0.7 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lxp/admin-api... build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3002
ENV APP_HOST=0.0.0.0

WORKDIR /app

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/apps/admin-api/package.json ./apps/admin-api/package.json
COPY --from=build /repo/apps/admin-api/dist ./apps/admin-api/dist
COPY --from=build /repo/packages ./packages

EXPOSE 3002

CMD ["node", "apps/admin-api/dist/main.js"]
