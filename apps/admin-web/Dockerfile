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

ARG VITE_ADMIN_API_URL=http://localhost:3002
ARG VITE_GATEWAY_API_URL=http://localhost:3001

ENV VITE_ADMIN_API_URL=$VITE_ADMIN_API_URL
ENV VITE_GATEWAY_API_URL=$VITE_GATEWAY_API_URL

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lxp/admin-web... build

FROM nginx:1.27-alpine AS runtime

RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location /assets/ {' \
  '    add_header Cache-Control "public, max-age=31536000, immutable" always;' \
  '    try_files $uri =404;' \
  '  }' \
  '  location = /service-worker.js {' \
  '    add_header Cache-Control "no-store" always;' \
  '    try_files $uri =404;' \
  '  }' \
  '  location = /manifest.webmanifest {' \
  '    add_header Cache-Control "no-store" always;' \
  '    try_files $uri =404;' \
  '  }' \
  '  location = /index.html {' \
  '    add_header Cache-Control "no-store" always;' \
  '    try_files $uri =404;' \
  '  }' \
  '  location / {' \
  '    add_header Cache-Control "no-store" always;' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

COPY --from=build /repo/apps/admin-web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
