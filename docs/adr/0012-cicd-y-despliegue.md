# ADR-0012: CI/CD y despliegue — GitHub Actions, SonarQube self-hosted, Dockerfile por app, deploy explícito vía CLI

**Estado:** Aceptada
**Fecha:** 2026-09-15
**Deciders:** Backend

## Contexto

ADR-0004 fijó el stack de la aplicación (lenguaje, framework, base de
datos, ORM, testing) pero dejó fuera de su alcance cómo se orquesta la
integración continua y cómo se despliega. ADR-0010 resolvió a su vez
dónde vive el storage de archivos y confirmó **Railway** como plataforma
de despliegue, pero tampoco definió qué dispara el build de las
imágenes ni cómo se corre el pipeline de calidad.

Con el backend ya con CRUD reales y tests (ADR-0007/0008/0009) y el
proyecto entrando en la ventana de despliegue (semana 4, ver
`CLAUDE.md`), hacía falta resolver cuatro piezas concretas que no tenían
ADR propio:

1. **Qué orquesta lint/tests/build** en un monorepo pnpm donde un PR de
   frontend no debería disparar ni esperar los checks del backend (y
   viceversa).
2. **Con qué se analiza la calidad del código** (cobertura, code
   smells, duplicación) y cómo ese análisis puede romper el pipeline si
   no cumple un umbral.
3. **Cómo se construyen las imágenes** que Railway despliega, dado que
   el repo es un workspace pnpm y el backend necesita pasos propios
   (generar el cliente de Prisma, correr `prisma migrate deploy`) que un
   builder genérico no conoce de entrada.
4. **Qué dispara el deploy real** a Railway, y cómo evitar que ese
   disparo compita con cualquier mecanismo de auto-deploy que Railway
   ya trae de fábrica.

## Decisión

### 1. Orquestación de CI: GitHub Actions

Todo el pipeline (`lint` → `test:cov` → `build` → análisis de calidad →
deploy) vive en `.github/workflows/ci-cd.yml`, un único workflow de
GitHub Actions con un job `changes` (`dorny/paths-filter`) que decide si
corren `backend-ci` y/o `frontend-ci` según qué paths cambiaron.

El repo ya vive en GitHub, así que no hay una cuenta ni un sistema
nuevo que dar de alta: los secrets, la protección de rama de `develop`
y el propio disparo por `push`/`pull_request` ya son parte del mismo
lugar donde el equipo trabaja. Los minutos gratuitos de Actions alcanzan
de sobra para el volumen de este MVP.

### 2. Análisis de calidad: SonarQube self-hosted, sin el GitHub App

El análisis de código corre contra un servidor **SonarQube self-hosted**
— el servidor personal de pruebas del desarrollador de backend, expuesto
a internet vía un túnel de Cloudflare — y no contra SonarCloud. La
elección fue pragmática: ya estaba levantado y configurado, no una
evaluación formal de costo/control frente a un servicio administrado.

La integración se arma **a mano en el workflow**, con las acciones
genéricas de SonarSource (`sonarqube-scan-action` +
`sonarqube-quality-gate-action`) y los secrets `SONAR_TOKEN` /
`SONAR_TOKEN_FRONTEND` / `SONAR_HOST_URL`, en vez de instalar el
**GitHub App** que SonarQube ofrece para auto-configurar el análisis por
rama y decorar los PRs. Ese GitHub App asume una integración estable y
a nivel de organización entre GitHub y el servidor Sonar — encaja mal
con un servidor personal detrás de un túnel, que puede cambiar de URL o
dejar de estar disponible sin aviso. Las acciones genéricas, en cambio,
no le atan nada al host: apuntan a cualquier `SONAR_HOST_URL` alcanzable,
así que migrar a otro servidor (u a SonarCloud, si hiciera falta) es
cambiar un secret, no reconfigurar una integración.

Cada proyecto del monorepo necesita su **propio** token de análisis — un
Project Analysis Token de SonarQube queda scopeado a un solo proyecto en
cualquier edición, no es una particularidad de un plan gratuito.

### 3. Build de las imágenes: Dockerfile propio por app, no Nixpacks

Railway construye por default con **Nixpacks** (detección automática, sin
Dockerfile). Este repo lo descarta y define su propio Dockerfile
multi-stage por app (`apps/backend/Dockerfile`, hecho; el del frontend
queda pendiente en la issue #50) más `.railway/railway.ts` declarando
`build: { builder: 'DOCKERFILE', dockerfilePath: '...' }`.

Nixpacks apunta a detectar un único paquete en la raíz del repo — no
sabe que tiene que instalar con `pnpm --filter backend`, ni que hace
falta `prisma generate` antes de compilar y `prisma migrate deploy`
antes de arrancar, ni te deja elegir qué queda en la imagen final. El
Dockerfile del backend (stages `deps` → `build` → `runtime`) resuelve
las tres cosas explícitamente: compila con las dependencias completas,
corre en producción solo con las de prod (imagen más chica, arranque más
rápido), y lo hace como usuario `node`, no root. Nada de esto es
alcanzable con la detección automática de Nixpacks sin, en la práctica,
terminar escribiéndole un Dockerfile de todos modos.

### 4. Deploy explícito vía CLI, no el auto-deploy de Railway

`.railway/railway.ts` declara el servicio del backend **sin** `source:
github(...)`. El deploy lo dispara el job `deploy-backend` del propio
workflow, corriendo `railway up --service qualitytrack-backend --ci`
solo en push a `main` (nunca en `develop` ni en `pull_request`), gateado
por que `backend-ci` haya terminado en éxito, con un grupo de
concurrencia (`cancel-in-progress`) para que, si se pushean varios
commits seguidos, solo termine el deploy del más reciente.

Si Railway además watcheara el repo por su cuenta (`source:
github(...)`), tendría dos disparadores de deploy para el mismo push:
uno gateado por tests/lint/Quality Gate (el de CI) y otro que no espera
nada de eso. El deploy vía CLI, disparado solo cuando el pipeline
completo ya dio verde, es la única fuente de verdad de "esto llegó a
producción".

## Opciones consideradas

### Orquestación de CI

No se evaluaron proveedores externos de CI en profundidad: con el
código ya alojado en GitHub, cualquier alternativa habría significado
una cuenta, unos secrets y un sistema más para dar de alta sin ninguna
ganancia concreta para el tamaño de este MVP. GitHub Actions fue la
opción por defecto, no la ganadora de una comparación.

### Análisis de calidad

| Opción                                                  | Evaluación                                                                                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SonarQube self-hosted, acciones genéricas — elegida** | Cero costo adicional (servidor ya existente); portable a cualquier host Sonar; sin dependencia de un GitHub App atado a una URL que puede cambiar.                                 |
| SonarCloud                                              | Servicio administrado, sin servidor que mantener — pero es un proveedor externo nuevo que dar de alta, y no resolvía nada que el servidor ya disponible no resolviera.             |
| Sin análisis de calidad automatizado                    | Más simple, pero sin gate de cobertura ni detección de code smells/duplicación — contradice el objetivo de tener un Quality Gate real (ver el trabajo de la tarea de gate al 80%). |

### Build de las imágenes

| Opción                                       | Evaluación                                                                                                                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dockerfile multi-stage por app — elegida** | Control total sobre el orden de build (Prisma, workspace pnpm), la imagen final (solo deps de prod, usuario no root) y el comando de arranque.                                                                                                                 |
| Nixpacks (default de Railway)                | Cero configuración para un paquete simple — pero no resuelve un workspace pnpm ni pasos custom (Prisma) sin capas de configuración adicionales que, en la práctica, terminan siendo tan explícitas como un Dockerfile propio, sin la ventaja de "cero config". |

### Disparo del deploy

| Opción                                                | Evaluación                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`railway up` desde el job de CI — elegida**         | Un solo disparador de deploy, gateado por el pipeline completo (lint/tests/build/Quality Gate) y solo en `main`.                                         |
| `source: github(...)` (auto-deploy nativo de Railway) | Más simple de configurar, pero dispara en paralelo al de CI — dos caminos de deploy para el mismo push, uno de ellos sin esperar a que el pipeline pase. |

## Consecuencias

- El pipeline queda estructuralmente atado a la disponibilidad del
  servidor personal de SonarQube (y de su túnel de Cloudflare): a
  diferencia del guard `if: env.SONAR_TOKEN != ''` (que solo salta el
  step si el secret no está cargado), si el servidor estuviera caído
  con el secret sí cargado, el step de Sonar fallaría en vez de
  saltearse. En la práctica no generó ningún problema — ambos proyectos
  (`qualitytrack-backend`, `qualitytrack-frontend`) están corriendo y
  reportando cobertura sin incidentes — pero sigue siendo una
  dependencia que un servicio administrado no tendría.
- El servidor de SonarQube no está declarado en `.railway/railway.ts` ni
  en ningún otro archivo versionado del repo: es infraestructura fuera
  del control de IaC del proyecto. Este ADR es, por ahora, el único
  registro de que existe y de por qué se eligió así.
- Sin el GitHub App de Sonar, no hay decoración automática de resultados
  en el PR — el detalle del análisis (code smells, duplicación) se
  revisa entrando al dashboard de SonarQube. El Quality Gate en sí sigue
  siendo visible como check del PR, vía el step
  `sonarqube-quality-gate-action`.
- El Dockerfile del frontend (issue #50) todavía no existe — el criterio
  de esta ADR (Dockerfile propio, no Nixpacks) aplica igual cuando se
  escriba, y `deploy-frontend` queda bloqueado hasta entonces (ver PR
  #55, fuera de alcance).
- Cada proyecto Sonar del monorepo necesita su propio token de análisis
  (`SONAR_TOKEN` para backend, `SONAR_TOKEN_FRONTEND` para frontend) —
  no se puede reusar el mismo token entre proyectos.

## Action Items

1. [x] `.github/workflows/ci-cd.yml`: jobs `changes` / `backend-ci` /
       `frontend-ci` con lint/test/build/Sonar por área (issue #48).
2. [x] `apps/backend/Dockerfile` multi-stage + `railway.json` /
       `.railway/railway.ts` con `builder: DOCKERFILE` (issue #49).
3. [x] Job `deploy-backend`: `railway up --ci` gateado por `backend-ci`,
       solo en push a `main` (issue #51, parcial).
4. [x] `SonarSource/sonarqube-quality-gate-action` en ambos jobs, para
       que el Quality Gate rompa el CI y no solo suba el análisis.
5. [ ] `apps/frontend/Dockerfile` + servidor estático, mismo criterio de
       Dockerfile propio (issue #50).
6. [ ] Job `deploy-frontend`, una vez exista el Dockerfile del frontend
       (issue #51, resto).
7. [ ] Si el servidor personal de SonarQube deja de estar disponible más
       adelante (no ha ocurrido hasta ahora), evaluar reemplazo
       (SonarCloud u otro servidor administrado) — no bloquea el MVP.

## Decisiones relacionadas

- ADR-0004: fija el stack de la aplicación; esta ADR cubre la capa de
  CI/CD y despliegue que ADR-0004 dejó explícitamente abierta.
- ADR-0009: Vitest es el runner que corren `test:cov` en `backend-ci` /
  `frontend-ci`, y el que genera el `lcov.info` que consume Sonar.
- ADR-0010: fija Railway como plataforma de despliegue y MinIO/Railway
  Bucket como storage; esta ADR cubre cómo se construye y dispara ese
  despliegue, no dónde vive.
