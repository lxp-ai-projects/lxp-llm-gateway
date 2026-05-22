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
RUN pnpm --filter @lxp/gateway-api... build

FROM node:24-bookworm-slim AS runtime

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV PORT=3001
ENV APP_HOST=0.0.0.0

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.0.7 --activate

COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /repo/turbo.json ./turbo.json
COPY --from=build /repo/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /repo/apps/gateway-api/package.json ./apps/gateway-api/package.json
COPY --from=build /repo/apps/gateway-api/dist ./apps/gateway-api/dist
COPY --from=build /repo/apps ./apps
COPY --from=build /repo/packages ./packages

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3001

CMD ["node", "apps/gateway-api/dist/main.js"]
