# syntax=docker/dockerfile:1
#
# Contexto de build = raíz del repo (no apps/backend): el workspace pnpm
# necesita ver pnpm-lock.yaml, pnpm-workspace.yaml y el resto de los
# manifests para resolver e instalar de forma reproducible.
#
#   docker build -f apps/backend/Dockerfile -t qualitytrack-backend .
#
# Ver docs/adr/0004-stack-tecnologico.md (Node 24 LTS, pnpm) y
# docs/adr/0010-almacenamiento-de-documentos.md (Railway como destino
# de despliegue). El healthcheck de la imagen y `railway.json` esperan
# GET /health (src/modules/health).

ARG NODE_VERSION=24-slim
ARG PNPM_VERSION=11.25.0

# ---------------------------------------------------------------------------
# Stage: deps -- resuelve el workspace completo (dev + prod) para poder
# compilar. Solo copia manifests, así este layer se cachea mientras no
# cambien los package.json ni el lockfile.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION
# Los engines de Prisma (schema-engine para `migrate`) se linkean contra
# libssl; sin el paquete openssl, el postinstall de @prisma/engines no
# puede detectar la versión instalada y cae a un default que puede no
# coincidir con la imagen (ver warning de Prisma en el build).
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig-base/package.json packages/tsconfig-base/package.json

RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage: build -- código fuente del backend, Prisma Client y compilación a
# dist/. `prisma generate` corre antes que `nest build` porque el generator
# emite a src/generated/prisma (ver schema.prisma), y ese código se compila
# junto con el resto de src/.
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

COPY apps/backend apps/backend

RUN pnpm --filter @qualitytrack/backend exec prisma generate
RUN pnpm --filter @qualitytrack/backend build

# ---------------------------------------------------------------------------
# Stage: runtime -- solo dependencias de producción (incluye `prisma`, que
# el startCommand de Railway necesita para `prisma migrate deploy`) + el
# resultado de la compilación. Sin devDependencies, sin código fuente.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ARG PNPM_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
ENV NODE_ENV=production

# La imagen base de node corre como root por defecto -- se crea /repo ya
# con el dueño correcto (sin contenido pesado todavía, así el chown es
# barato) y el resto de la instalación corre como el usuario sin
# privilegios `node` para no necesitar un chown -R sobre node_modules
# más adelante (eso duplicaría esa capa entera en la imagen final).
RUN mkdir -p /repo && chown node:node /repo
WORKDIR /repo
USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/backend/package.json apps/backend/package.json
COPY --chown=node:node apps/frontend/package.json apps/frontend/package.json
COPY --chown=node:node packages/eslint-config/package.json packages/eslint-config/package.json
COPY --chown=node:node packages/tsconfig-base/package.json packages/tsconfig-base/package.json

RUN pnpm install --prod --frozen-lockfile --filter @qualitytrack/backend

COPY --chown=node:node --from=build /repo/apps/backend/dist apps/backend/dist
COPY --chown=node:node apps/backend/prisma apps/backend/prisma
COPY --chown=node:node apps/backend/prisma7.config.ts apps/backend/prisma7.config.ts

WORKDIR /repo/apps/backend
# node_modules/.bin en el PATH: permite invocar `prisma migrate deploy`
# tal cual (sin pnpm/npx) tanto acá como en el startCommand de Railway.
ENV PATH="/repo/apps/backend/node_modules/.bin:${PATH}"

EXPOSE 3000

# Railway pisa este CMD con el `startCommand` de railway.json, pero se
# deja el mismo comportamiento acá para poder probar la imagen suelta
# con `docker run` contra un Postgres de prueba.
CMD ["sh", "-c", "prisma migrate deploy && node dist/main.js"]
