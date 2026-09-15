# Guía de contribución — QualityTrack

Convenciones de desarrollo para todo el equipo. Ver también `CLAUDE.md`
para el contexto general del proyecto y `docs/architecture.md` para el
modelo de datos.

## Mensajes de commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/). El
mensaje se escribe en inglés (mismo criterio que el resto del código —
ver "Convenciones de código" en `CLAUDE.md`) y se valida automáticamente
al commitear: un hook rechaza el commit si no cumple el formato, así que
no depende de que cada uno se lo acuerde de memoria.

Formato:

```
<tipo>(<alcance opcional>): <descripción en modo imperativo, minúscula, sin punto final>
```

Tipos disponibles:

| Tipo       | Cuándo usarlo                                                  |
| ---------- | -------------------------------------------------------------- |
| `feat`     | Nueva funcionalidad                                            |
| `fix`      | Corrección de un bug                                           |
| `docs`     | Solo cambios de documentación                                  |
| `style`    | Formateo, sin cambios de lógica                                |
| `refactor` | Cambio de código que no arregla un bug ni agrega funcionalidad |
| `test`     | Agregar o corregir tests                                       |
| `chore`    | Tareas de mantenimiento (dependencias, configuración)          |
| `perf`     | Mejora de performance                                          |

Ejemplos con el dominio del proyecto:

```
feat(work-orders): add state transition endpoint
fix(quotes): correct cardinality validation on approval
docs: update architecture.md with quality control fields
chore: configure husky and lint-staged
```

El alcance (`work-orders`, `quotes`, etc.) es opcional pero recomendado —
ayuda a filtrar el historial por área más adelante.

## Formateo de código: Prettier

Prettier formatea el código automáticamente (comillas, punto y coma,
indentación) para que nadie discuta estilo en un PR. La configuración
vive en `.prettierrc.json` — no hace falta tocarla a mano, corre sola en
cada commit vía el hook de pre-commit.

## Hooks de Git: Husky + lint-staged + commitlint

- **`pre-commit`** corre `lint-staged`, que a su vez corre Prettier solo
  sobre los archivos que estás commiteando — no todo el repo, mucho más
  rápido.
- **`commit-msg`** corre `commitlint`, que rechaza el commit si el
  mensaje no sigue el formato de Conventional Commits de arriba.

Ambos hooks corren en tu máquina, antes de que el commit llegue a
existir. Si algo falla, el commit no se crea: corregís (o dejás que
Prettier lo arregle solo) y volvés a intentar.

## Instalación

Usamos [pnpm](https://pnpm.io/) como gestor de paquetes. Husky y el resto
de las herramientas ya están configuradas en el repo — nadie necesita
instalarlas desde cero.

```bash
pnpm install
```

Con eso alcanza. El script `prepare` (definido en `package.json`) deja los
hooks activos automáticamente después del install.

Si `pnpm install` se detiene pidiendo aprobar "build scripts" de alguna
dependencia nueva, es el gate de seguridad de pnpm (ver `allowBuilds` en
`pnpm-workspace.yaml`) — no ejecuta scripts nativos de paquetes de
terceros sin aprobación explícita. Corré `pnpm approve-builds`, revisá
qué paquete es antes de aprobar, y commiteá el `pnpm-workspace.yaml`
actualizado para que el resto del equipo no vuelva a toparse con el
mismo bloqueo.

## Estructura del proyecto

Monorepo con [pnpm workspaces](https://pnpm.io/workspaces):

```
apps/
  backend/    NestJS — API. El único paquete con código por ahora.
  frontend/   React — todavía sin inicializar.
  e2e/        Tests end-to-end — todavía sin inicializar.
packages/
  shared-types/    Tipos TypeScript compartidos entre apps.
  eslint-config/   Configuración de ESLint (base, react.js, nestjs.js).
  tsconfig-base/   tsconfig base que cada app extiende.
```

Para correr o testear una app puntual, usá `--filter` en vez de entrar a
la carpeta con `cd`:

```bash
pnpm --filter backend test
```

### Scripts `dev`

Cada app expone un script `dev` (alias corto y consistente entre
frontend y backend). Desde la raíz del repo:

```bash
pnpm dev:backend    # solo backend
pnpm dev:frontend   # solo frontend
pnpm dev            # ambos en paralelo
```

Si estás trabajando solo en una parte, usá el comando específico —
`pnpm dev` levanta las dos apps a la vez, así que solo tiene sentido si
necesitás ver el sistema completo funcionando (por ejemplo, para probar
la integración frontend-backend).

Cada app documenta el resto de sus comandos propios en su `README.md`
(ver `apps/backend/README.md`). Esta sección solo ubica la estructura
general; no duplica esos comandos.

**Cambios en `packages/`:** como los consumen ambas apps, un cambio ahí
(sobre todo en `shared-types`) puede afectar a la otra app sin que se note
en la carpeta que estás editando. Si tu PR toca `packages/`, pedí revisión
de alguien del otro equipo (frontend/backend) además de la tuya.

## Flujo de trabajo con Git

### Ramas

Usamos un Git Flow simplificado, con dos ramas permanentes:

- **`main`** — rama estable, siempre desplegable. Nadie commitea directo
  ahí; solo recibe merges desde `develop`.
- **`develop`** — rama de integración. Todas las tareas mergean acá
  primero. `main` se actualiza desde `develop` cuando hay una entrega o
  demo lista, no en cada tarea individual.

Para trabajar en una tarea:

- Una rama por tarea, creada **desde `develop`** (no desde `main`), y
  nunca se reusa una rama para varias cosas distintas.
- Nomenclatura: `<tipo>/<numero-issue>-<descripcion-corta>`
  - `feature/45-expediente-unico`
  - `fix/32-cardinalidad-cotizacion`
  - `chore/12-setup-husky`

  El tipo es el mismo prefijo que usamos en los commits — así se identifica
  de un vistazo qué clase de cambio trae la rama.

No usamos `release/*` ni `hotfix/*` — para el tamaño y ritmo del equipo,
agregan proceso sin agregar valor. Si en algún momento hace falta un
arreglo urgente sobre lo ya desplegado en `main`, se rama igual desde
`develop` (o se evalúa el caso puntual en el equipo).

### Pull Requests

- Se abre el PR cuando la tarea está lista para revisión (no antes).
- **El destino del PR es `develop`**, no `main` — salvo el merge
  periódico de `develop` a `main` para una entrega, que se coordina
  aparte y no sigue este flujo de tarea-por-tarea.
- El PR referencia el issue que resuelve (`Closes #45` en la descripción)
  — así el issue se cierra solo al mergear.
- Descripción mínima: qué cambia y cómo probarlo. No hace falta un
  template elaborado, dos líneas alcanzan.
- No se exige aprobación de otra persona para mergear — somos 5, con
  roles distintos (backend, frontend, QA, UX/UI, data analyst) y varios
  todavía aprendiendo; exigir un review formal en cada PR puede dejarlo
  trabado esperando a alguien sin el contexto para juzgarlo. Lo que sí
  es obligatorio es pasar por PR (no se puede pushear directo a `main`
  ni a `develop`), así queda registro y cualquiera puede comentar antes
  de que se mergee si tiene tiempo.
- Pedí una revisión activamente cuando el cambio lo amerite: toca
  `packages/` compartidos, es un cambio grande, o no estás seguro. No
  hace falta esperar a que el sistema te lo exija.

### Merge

- Squash and merge: todos los commits de la rama se colapsan en uno solo,
  usando el título del PR (en formato Conventional Commits) como mensaje
  final. El historial de `develop` queda prolijo sin depender de que cada
  commit intermedio de la rama sea perfecto.
- Borrar la rama automáticamente después del merge.
- El merge de `develop` a `main` se hace aparte (merge normal, no
  squash) para conservar en `main` la granularidad de lo que se sumó
  desde la última entrega.

`main` y `develop` están protegidas en _Settings → Branches_: nadie puede
pushear directo ni hacer force-push, y mergear requiere pasar por PR. No
exigimos aprobación mínima ahí — ver la razón en "Pull Requests" arriba.
Si el equipo crece o el ritmo cambia, esa regla se puede volver a exigir
desde la misma pantalla.

## Si un hook falla

- **Prettier corrigió algo solo:** revisá el diff, agregá los cambios
  (`git add`) y volvé a commitear.
- **`commitlint` rechazó el mensaje:** ajustá el mensaje al formato de
  arriba y volvé a intentar el commit.
- **Necesitás saltarte un hook por una razón puntual** (no como
  costumbre): `git commit --no-verify`. Usarlo sistemáticamente anula el
  sentido de tener los hooks.
