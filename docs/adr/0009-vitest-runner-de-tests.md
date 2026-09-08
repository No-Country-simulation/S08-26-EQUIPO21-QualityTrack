# ADR-0009: Vitest como runner de tests del backend (enmienda a ADR-0004)

**Estado:** Aceptada
**Fecha:** 2026-09-08
**Deciders:** Backend

## Contexto

ADR-0004 fijó "Testing: Jest (unit + integración), Supertest para HTTP"
como parte del stack. Esa línea reflejaba el scaffolding inicial del
repo (`nest new` trae Jest + ts-jest), no una evaluación.

Al implementar el primer módulo con lógica real (el CRUD de `CUSTOMER`,
ver ADR-0007 / ADR-0008) y querer correr sus tests, el runner de Jest
resultó no funcionar de fábrica. La causa raíz:

- **NestJS 12 es ESM puro.** `@nestjs/common`, `@nestjs/core` y
  `@nestjs/testing` tienen `"type": "module"` — solo exportan ESM.
- **El cliente que genera Prisma 7** se importa a sí mismo con
  especificadores ESM `./foo.js` que en realidad apuntan a archivos
  `.ts`.
- **Jest corre en CommonJS** por defecto y su runtime bloquea la carga
  de módulos ESM salvo que se lo ponga en modo experimental.

Dejar Jest funcionando exigió apilar parches:

1. `node --experimental-vm-modules` en todos los scripts de test.
2. `preset: ts-jest/presets/default-esm` + `useESM: true`.
3. Un `tsconfig.spec.json` que fuerza `module: esnext` (el base usa
   `nodenext`, que hace emitir CommonJS).
4. Un `moduleNameMapper` que borra la extensión `.js` de los imports
   relativos para que el resolver encuentre el `.ts`.
5. `@jest/globals` como dependencia y un `import { jest } from
'@jest/globals'` en cada spec (en modo ESM Jest no inyecta el global).
6. `transformIgnorePatterns` ajustado para transpilar `@nestjs/*`.

Seis piezas de configuración frágil, que cualquier cambio futuro de
tsconfig o de versiones puede romper sin que nadie lo note hasta que el
CI falle. Y todavía sin ningún beneficio: Jest quedó igual de lento y
con la misma API.

## Decisión

El backend usa **Vitest** como runner de tests, en lugar de Jest.

- `Test.createTestingModule()` de `@nestjs/testing` **no cambia** —
  Vitest reemplaza el runner, no el harness de NestJS.
- **Supertest se mantiene** para los tests HTTP end-to-end.
- El type-checking de los tests queda 100% en `tsc --noEmit` (que ya se
  corre por separado); Vitest transpila con esbuild y no chequea tipos,
  igual que hacía ts-jest con `isolatedModules: true`.

Esto **enmienda ADR-0004**: donde dice "Jest (unit + integración)", se
lee "Vitest (unit + integración)". El resto del stack de ADR-0004 no
cambia.

## Opciones consideradas

### Opción A: Seguir con Jest + los 6 parches

| Dimensión                        | Evaluación                                       |
| -------------------------------- | ------------------------------------------------ |
| Costo de migrar ahora            | Cero (ya está hecho)                             |
| Fragilidad de la config          | Alta — 6 piezas acopladas a versiones y tsconfig |
| Velocidad                        | La de Jest, sin mejora                           |
| Consistencia con el frontend     | Nula — el frontend usará Vitest                  |
| Curva para un equipo que aprende | Alta — hay que entender por qué cada parche      |

**Descartada.** El único pro es no hacer nada ahora; el costo es cargar
indefinidamente con una config que nadie del equipo entiende del todo.

### Opción B: Migrar a Vitest ahora — elegida

| Dimensión                        | Evaluación                                    |
| -------------------------------- | --------------------------------------------- |
| Costo de migrar ahora            | Bajo — solo 2 specs reales existen            |
| Fragilidad de la config          | Baja — ESM-first, sin parches                 |
| Velocidad                        | Mejor arranque y watch                        |
| Consistencia con el frontend     | Total — un runner en todo el monorepo         |
| Curva para un equipo que aprende | Baja — API tipo Jest, sin config que explicar |

**Pros:**

- Elimina las 6 piezas de config: `tsconfig.spec.json`, el
  `moduleNameMapper`, `--experimental-vm-modules`, `@jest/globals`,
  `transformIgnorePatterns`, el preset ESM de ts-jest.
- NestJS 12 (ESM) y el cliente Prisma 7 (ESM) cargan sin configuración
  extra.
- Reusa `vite-tsconfig-paths` para los alias de `tsconfig`, sin
  duplicarlos.
- Mismo runner que va a usar el frontend: una sola sintaxis de mocks
  (`vi.fn()`), un solo set de comandos, un solo cuerpo de conocimiento —
  relevante para un equipo donde parte de la gente está aprendiendo
  (criterio de DX de ADR-0004).
- API casi idéntica a Jest: `describe / it / expect` igual;
  `jest.fn()` → `vi.fn()`.

**Cons:**

- Cambia una decisión ya registrada (ADR-0004) — por eso este ADR.
- `vi.mock()` con hoisting se comporta distinto a `jest.mock()` en
  algunos casos con ESM. No nos afecta: el mocking de dependencias de
  NestJS se hace con `{ provide: X, useValue: ... }`, no con
  `vi.mock()`.
- Coverage pasa de `istanbul` a `v8` — equivalente para el MVP.

### Opción C: Migrar a Vitest más adelante

**Descartada.** Cada semana se escriben más specs contra la API de Jest
y más documentación que menciona Jest. El momento más barato para
migrar es ahora, con 2 specs y nada commiteado.

## Consecuencias

- **Dependencias:** se quitan `jest`, `ts-jest`, `@jest/globals`,
  `@types/jest`. Se agregan `vitest`, `@vitest/coverage-v8`,
  `vite-tsconfig-paths`, `unplugin-swc` (para que Vitest respete los
  decoradores de NestJS).
- **Archivos:** se borran `jest.config.ts` y `test/jest-e2e.json`. Se
  agregan `vitest.config.ts` (unit) y `vitest.config.e2e.ts` (e2e).
- **`tsconfig.json`:** `types: ["node", "jest"]` → `["node"]`; se puede
  quitar el `rootDir: "./src"` que se había agregado solo para
  destrabar Jest (Vitest no lo necesita) — se deja porque tampoco
  molesta y alinea con `tsconfig.build.json`.
- **`tsconfig.spec.json`:** se elimina (era un parche de Jest).
- **Scripts (`package.json`):** `"test": "vitest run"`,
  `"test:watch": "vitest"`, `"test:cov": "vitest run --coverage"`,
  `"test:e2e": "vitest run --config vitest.config.e2e.ts"`. Sin el flag
  de Node.
- **Specs existentes:** `jest.fn()` → `vi.fn()`,
  `jest.Mocked<T>` → `import type { Mock } from 'vitest'` /
  `MockedFunction`; se quita el `import { jest } from '@jest/globals'`.
  Con `globals: true` en la config, `describe / it / expect` siguen sin
  import.
- **`test/app.e2e-spec.ts`:** es el spec de ejemplo de `nest new` y
  prueba un endpoint `GET /` con "Hello World" que no existe en este
  proyecto. Se reemplaza por un smoke test real (`GET /health` → 200) o
  se elimina hasta tener un e2e de verdad (el de `dossier`, ADR-0005).
- **Docs:** `CLAUDE.md` (tabla de stack), `docs/adr/0004` (nota de
  enmienda), `apps/backend/README.md` (tabla de scripts) y
  `docs/backend-structure.md` si menciona Jest.

## Action Items

1. [x] Quitar Jest y sus parches (`jest`, `ts-jest`, `@jest/globals`,
       `@types/jest`); agregar Vitest + `unplugin-swc` + `@swc/core` +
       `@vitest/coverage-v8`. La resolución de `paths` de tsconfig la
       hace Vitest de forma nativa (`resolve.tsconfigPaths`), sin
       `vite-tsconfig-paths`.
2. [x] `vitest.config.mts` (unit) y `vitest.config.e2e.mts` (e2e,
       standalone — no `mergeConfig`, que fusiona los `include`).
       Extensión `.mts` porque el `package.json` del backend no tiene
       `"type": "module"`.
3. [x] Borrar `jest.config.ts`, `test/jest-e2e.json`,
       `tsconfig.spec.json`.
4. [x] Migrar `customers.service.spec.ts` y
       `customers.controller.spec.ts` a `vi.*` (`Mocked<T>` de `vitest`).
5. [x] Reemplazar `test/app.e2e-spec.ts` por `test/health.e2e-spec.ts`
       (smoke test de `GET /health`).
6. [x] Scripts de `package.json` (`vitest run`, sin el flag de Node) y
       tabla de `apps/backend/README.md`.
7. [x] Enmendar la línea de testing en `CLAUDE.md` y agregar la nota de
       enmienda en `docs/adr/0004-stack-tecnologico.md`.
8. [x] `tsconfig.json`: `types` pasa a `["node", "vitest/globals"]`; se
       quita el `rootDir` (queda solo en `tsconfig.build.json`) y se
       agrega un `include` explícito para que el type-check cubra
       `test/` y las configs `.mts` sin el error `TS6059`.

## Decisiones relacionadas

- ADR-0004: se enmienda — "Jest" pasa a "Vitest" en la fila de Testing.
  El resto del stack (TypeScript, NestJS, PostgreSQL, Prisma, pnpm,
  Supertest) no cambia.
- ADR-0007 / ADR-0008: el CRUD de `CUSTOMER` cuyas pruebas destaparon el
  problema; sus specs son las que se migran en esta ADR.
