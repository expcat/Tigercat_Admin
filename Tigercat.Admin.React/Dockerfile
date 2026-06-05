# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /src

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY Tigercat.Admin.MockApi/package.json Tigercat.Admin.MockApi/
COPY Tigercat.Admin.React/package.json Tigercat.Admin.React/
RUN corepack enable && pnpm install --frozen-lockfile

COPY Tigercat.Admin.MockApi/ Tigercat.Admin.MockApi/
COPY Tigercat.Admin.React/ Tigercat.Admin.React/
COPY scripts/ scripts/
RUN pnpm build:react

FROM nginx:1.27-alpine AS runtime
COPY Tigercat.Admin.React/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/Tigercat.Admin.React/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
