# QualityTrack — contexto para Claude Code

Sistema B2B de gestión y trazabilidad documental del ciclo de vida de
Órdenes de Trabajo (OT) para una fábrica de mecanizado de piezas
industriales. Proyecto de simulación laboral (No Country), cohorte
S08-26-EQUIPO21.

## Criterio de éxito del MVP

Cualquier usuario (comercial, jefe de planta, calidad, auditor) debe poder
consultar una OT y reconstruir todo su historial de punta a punta —
documentos incluidos — desde una única pantalla, sin recurrir a archivos
externos ni planillas. Toda decisión de arquitectura se evalúa contra esto.

## Flujo de negocio

Solicitud Cliente → Cotización → Aprobación → OT → Hoja de Ruta →
Operaciones en Planta → Control de Calidad → Entrega

## Convenciones de código

- **Documentación** (este repo, ADRs, comentarios largos): en español.
- **Identificadores de código** — nombres de funciones, variables, tablas,
  campos de base de datos, endpoints de la API: en inglés.
- La entidad de negocio "Orden de Trabajo" se llama `WORK_ORDER` en el
  modelo de datos y en el código, y sigue siendo "OT" en la documentación
  y en las conversaciones del equipo.

## Flujo de contribución

Ver `CONTRIBUTING.md` para el detalle completo. Resumen:

- Mensajes de commit en formato Conventional Commits, en inglés (ej:
  `feat(work-orders): add state transition endpoint`). El hook
  `commit-msg` (Husky + commitlint) rechaza el commit si no cumple el
  formato — no hace falta memorizarlo.
- Prettier formatea el código automáticamente antes de cada commit vía el
  hook `pre-commit` (Husky + lint-staged), solo sobre los archivos
  modificados. No correrlo a mano ni pelear con el estilo en un PR.

## Stack

Decisión completa y alternativas evaluadas en
@docs/adr/0004-stack-tecnologico.md.

| Capa                   | Elección                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Lenguaje               | TypeScript (`strict`)                                                                             |
| Runtime                | Node.js 24 LTS                                                                                    |
| Gestor de paquetes     | pnpm (workspaces / monorepo)                                                                      |
| Framework de API       | NestJS 12                                                                                         |
| Framework de frontend  | React 19 (Vite)                                                                                   |
| Motor de base de datos | PostgreSQL                                                                                        |
| ORM                    | Prisma — `schema.prisma` es la fuente de verdad del modelo                                        |
| Storage de archivos    | Object storage S3-compatible; solo la URL/clave va en `DOCUMENT.url` (proveedor pendiente de ADR) |
| Testing                | Jest (unit + integración), Supertest para HTTP                                                    |
| Lint / formato         | oxlint + Prettier                                                                                 |

Los binarios (planos, certificados, PDF) nunca se guardan en la base de
datos — van a object storage y la BD guarda solo metadatos y la
referencia.

## Modelo de datos y decisiones de arquitectura

Ver @docs/architecture.md para el ERD completo y la máquina de estados de
la OT. Ver @docs/adr/0001-cardinalidad-cotizacion-orden-trabajo.md y
@docs/adr/0002-reproceso-no-conformidad.md para el razonamiento detrás de
las dos decisiones no obvias del modelo, y
@docs/adr/0004-stack-tecnologico.md para la decisión de stack (lenguaje,
framework, motor de base de datos, ORM).

## Roles y flujo de usuario

Ver @docs/ux-research-brief.md — roles (Comercial, Planta, Calidad,
Auditor), el recorrido feliz en lenguaje de negocio, y las preguntas
abiertas que UX/UI tiene que resolver con investigación. Es
documentación viva: si un rol cambia de nombre, se separa en dos, o el
flujo de negocio se ajusta, este archivo se actualiza en el mismo commit
— no queda desactualizado esperando la próxima revisión.

## Reglas del dominio (no romper)

- Toda transición de estado de una `WORK_ORDER` inserta una fila en
  `STATUS_HISTORY` en la misma transacción que actualiza
  `WORK_ORDER.status`. Nunca separar ambos pasos — es la tabla que
  sostiene el criterio de éxito.
- No asumir que toda `QUOTE` tiene una `WORK_ORDER` asociada: la relación
  es 1 a (0 o 1) hasta que la cotización se aprueba (ver ADR-0001).
- El endpoint `GET /work-orders/:id/dossier` debe devolver en una sola
  respuesta todo lo que necesita la pantalla de expediente único: datos
  de la OT, historial de estados, documentos, hoja de ruta y control de
  calidad. No dividir esto en múltiples llamadas.
- Los endpoints de agregación para reportes (tiempos por etapa, no
  conformidades) se coordinan con el rol Data Analyst antes de
  implementarse.
- `APP_USER`, no `USER`: en PostgreSQL y en el estándar SQL, `USER` es
  palabra reservada (sinónimo de `CURRENT_USER`). Usarla como nombre de
  tabla obliga a entrecomillarla en cada query.

## Gestión de trabajo

Backlog en GitHub Projects (`No-Country-simulation/497`). Cada issue tiene
campos `Rol`, `Etapa` y `Prioridad`. Historias de desarrollo usan la
plantilla `[TASK]`, bugs la plantilla `[BUG]` (con severidad y prioridad
separadas), y funcionalidades nuevas la plantilla `[FEATURE]` (con gate de
alcance MVP).
