# syntax=docker/dockerfile:1
#
# Contexto de build = raíz del repo (no apps/frontend): mismo motivo que
# apps/backend/Dockerfile -- el workspace pnpm necesita pnpm-lock.yaml y
# el resto de los manifests para instalar de forma reproducible.
#
#   docker build -f apps/frontend/Dockerfile \
#     --build-arg VITE_API_URL=https://qualitytrack-backend.up.railway.app/api/v1 \
#     -t qualitytrack-frontend .
#
# VITE_API_URL es build-time, no runtime: Vite lo inlinea en el bundle al
# correr `vite build` (ver src/app/api/client.ts) -- una vez compilado, el
# nginx que sirve el resultado no necesita saber nada de esa URL.
#
# Ver docs/adr/0004-stack-tecnologico.md (Node 24 LTS, pnpm, React + Vite)
# e issue #50.

ARG NODE_VERSION=24-slim
ARG PNPM_VERSION=11.25.0
ARG NGINX_VERSION=1.27-alpine

# ---------------------------------------------------------------------------
# Stage: deps -- resuelve el workspace completo (dev + prod): `vite build`
# necesita las devDependencies (typescript, vite, sus plugins). Solo copia
# manifests, así este layer se cachea mientras no cambien los package.json
# ni el lockfile.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig-base/package.json packages/tsconfig-base/package.json

RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage: build -- código fuente del frontend + build de producción. Vite
# lee VITE_API_URL de las variables de entorno del proceso (además de un
# .env, que en este build no existe -- ver .dockerignore) y lo inlinea en
# el bundle; por eso el ENV se fija recién antes de `vite build`, no antes
# (invalidaría el cache de la stage `deps` en cada build con una URL
# distinta si estuviera más arriba).
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

# tsconfig.app.json extiende packages/tsconfig-base/react.json -- la
# stage `deps` solo copió su package.json (para el install), acá hace
# falta el contenido real.
COPY packages/tsconfig-base packages/tsconfig-base
COPY apps/frontend apps/frontend

ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build-arg is required" >&2 && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter frontend build

# ---------------------------------------------------------------------------
# Stage: runtime -- nginx sirve el build estático. Sin Node ni
# node_modules: el resultado de `vite build` es HTML/JS/CSS, no necesita
# runtime de JavaScript para servirse.
# ---------------------------------------------------------------------------
FROM nginx:${NGINX_VERSION} AS runtime

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
