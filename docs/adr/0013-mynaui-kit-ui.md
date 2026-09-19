# ADR-0013: shadcn/ui + MynaUI como kit UI del frontend

**Estado:** Aceptada
**Fecha:** 2026-09-19
**Deciders:** Frontend

## Contexto

La issue #67 ("Kit de Componentes UI atómicos") necesita un kit de
componentes tipados sobre Tailwind CSS v4 para construir las cuatro
pantallas de rol (Comercial, Producción, Calidad y Dossier) sin
duplicar estilos ni la lógica de estados de `QUOTE` y `WORK_ORDER`.

Se decide usar **MynaUI** (`mynaui.com`) como kit de UI. Al investigar
cómo se instala, aparece un matiz que no era obvio desde el sitio de
marketing:

- MynaUI se distribuye vía el **CLI de shadcn** (`npx shadcn add
@mynaui/<nombre>`), no como paquete npm de componentes. Cada instalación
  copia archivos fuente al repo.
- Lo que MynaUI llama "componentes" son mayormente **bloques
  compuestos con nombre numerado** (`button1`…`button5`, `dialog1`…
  `dialog6`, `table1`…`table5`, `emptystates1`…`emptystates5`) que ya
  traen contenido de negocio ajeno a este proyecto (un dialog de login,
  una tabla de notificaciones con badges de estado, un empty state de
  "sin permiso" con formulario). No son átomos genéricos.
- Debajo de esos bloques hay primitivos reales y reutilizables
  (`@/components/ui/button`, `badge`, `dialog`, `table`, `tabs`,
  `pagination`, `skeleton`, `input`, `label`…) que son, en los hechos,
  **shadcn/ui base** (Radix UI por debajo) — MynaUI es shadcn/ui con una
  librería de iconos propia (`@mynaui/icons-react`), un archivo de Figma
  y esos bloques compuestos encima.
- No todo tiene primitivo: `EmptyState` y un `Table` genérico
  "columnas como datos" (nuestro patrón, ver
  `docs/frontend-structure.md` §3) no existen como átomo en ningún
  lado — ni en shadcn/ui ni en MynaUI. `SearchInput` con debounce
  tampoco.

## Decisión

Se adopta la base de MynaUI tal como realmente se instala:

1. **Primitivos vía CLI de shadcn (registro por defecto, base Radix):**
   `Button`, `Badge`, `Alert`, `Tabs`, `Dialog`, `Table` (las piezas
   `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`),
   `Pagination`, `Skeleton`, `Input`, `Label`. El foco atrapado del
   `Dialog`, la navegación por teclado de `Tabs`, etc. los resuelve
   Radix, no código propio.
2. **`@mynaui/icons-react`** como paquete npm para los iconos (lupa de
   `SearchInput`, cierre de `Dialog`, etc.), en vez de SVG inline.
3. **Se escriben a mano, sobre esos primitivos**, los átomos sin
   equivalente en shadcn/ui ni MynaUI: `Table` como wrapper genérico
   "columnas como datos" (usa las piezas de `Table` de shadcn/ui por
   dentro), `Field` (usa `Label`), `SearchInput` (usa `Input` +
   debounce), `EmptyState` y `ErrorState` (presentacionales, sin
   primitivo debajo). Estos cinco no se sacan de los bloques numerados
   de MynaUI: adaptar `table3` ("notificaciones con badges de estado")
   o `emptystates2` ("sin permiso, con formulario") a un átomo genérico
   sin contenido de negocio es más trabajo que escribirlos directo
   sobre el primitivo.
4. Los bloques numerados de MynaUI (`dialog1`…`dialog6`, `table1`…
   `table5`, etc.) quedan como **referencia de diseño**, no como código
   que se instala: si una feature necesita un dialog de confirmación
   destructiva o una tabla con acciones, se mira `dialog4` / `table2`
   como inspiración visual y se arma con los primitivos + `Table`/
   `Field` propios, no copiando el bloque completo.

### Instalación concreta

```bash
# Base shadcn/ui sobre el proyecto Vite + Tailwind v4 existente
npx shadcn@latest init --template vite -b radix -y

# components.json: se agrega el registro de MynaUI (icons y como
# referencia de bloques, aunque no se instalen los bloques en sí)
# "registries": { "@mynaui": "https://mynaui.com/r/{name}.json" }

# Primitivos (registro por defecto de shadcn, no @mynaui/*)
npx shadcn@latest add button badge alert tabs dialog table pagination skeleton input label

# Iconos
pnpm --filter frontend add @mynaui/icons-react
```

Los primitivos viven en `src/components/ui/base/` (no sueltos en
`src/components/ui/`), separados de `DataTable.tsx`, `Field.tsx`,
`SearchInput.tsx`, `EmptyState.tsx` y `ErrorState.tsx`. La carpeta marca
la frontera de propiedad: todo lo que hay adentro lo generó el CLI de
shadcn y se trata como vendorizado (se toca solo para extender un `cva`
puntual, como el caso de `alert.tsx` más abajo, no para reescribirlo);
lo que está fuera de `base/` es código del equipo. `components.json`
apunta su alias `ui` a `@/components/ui/base`, así que
`npx shadcn add <primitivo>` nuevo cae directo ahí sin mover nada a
mano. El único ajuste manual sobre un primitivo generado es
`base/alert.tsx`: shadcn/ui solo trae las variantes `default` y
`destructive` en su `cva`; se le agregaron `info`, `success` y
`warning` porque el dominio las necesita (ej. `ReprocessAlert`) y no
hay otra forma de conseguirlas sin ese archivo.

## Opciones consideradas

### Opción A: Escribir los átomos a mano, sin librería headless

| Dimensión                                | Evaluación                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| Dependencias nuevas                      | Ninguna                                                                     |
| Accesibilidad (foco, teclado)            | A mantener a mano en cada componente y cada primitivo nuevo que aparezca    |
| Consistencia visual con el diseño real   | Nula — no hay Figma detrás, cada componente es una aproximación propia      |
| Velocidad para las 8 pantallas restantes | Baja — cada patrón nuevo (dropdown, select, combobox) se escribe desde cero |

**Descartada.** El proyecto tiene 3 semanas de ejecución
(`CLAUDE.md`); mantener a mano el foco atrapado, el roving tabindex y
el resto de la accesibilidad de cada primitivo nuevo que aparezca
(`Select` para `ClientCombobox`, `DropdownMenu` para `RowAction`) no es
un buen uso de ese tiempo cuando Radix ya lo resuelve.

### Opción B: Instalar los bloques numerados de MynaUI tal cual (`dialog4`, `table3`, `emptystates2`…)

**Pros:** cero código propio para escribir, resultado visualmente
pulido de inmediato.
**Cons decisivos:** cada bloque trae contenido de negocio ajeno al
dominio (formularios de login, notificaciones, "sin permiso") que hay
que reescribir de todos modos; ningún bloque expone la API genérica
"columnas como datos" que pide `docs/frontend-structure.md` §3 — se
terminaría escribiendo una tabla distinta por pantalla, exactamente lo
que esa regla prohíbe. Se usan como referencia visual, no como código.

### Opción C: Primitivos de shadcn/ui + `@mynaui/icons-react`, wrappers propios donde no hay átomo — elegida

| Dimensión                                 | Evaluación                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Accesibilidad                             | Resuelta por Radix en `Tabs`/`Dialog`/`Select` (cuando se agregue)                              |
| Fidelidad al patrón "columnas como datos" | Se mantiene — es nuestro wrapper, sobre `Table` de shadcn/ui                                    |
| Dependencias nuevas                       | `radix-ui` (unificado), `class-variance-authority`, `clsx`,                                     |
| `tailwind-merge`, `@mynaui/icons-react`   |
| Trabajo manual restante                   | `SearchInput`, `Field`, `EmptyState`, `ErrorState`, `Table` — apoyados en primitivos accesibles |

**Pros:** foco atrapado, `Esc`, roving tabindex, `aria-*` los resuelve
Radix una sola vez para todo el kit, no por componente; el patrón
`columns[]` de `docs/frontend-structure.md` §3 se conserva porque
ninguna librería lo reemplaza igual; queda un camino claro para sumar
`Select`/`DropdownMenu`/`Combobox` (que `ClientCombobox` va a
necesitar, FE-05b) sin escribir un listbox accesible a mano.
**Cons:** cinco componentes (`Table`, `SearchInput`, `Field`,
`EmptyState`, `ErrorState`) siguen siendo código propio — MynaUI no los
resuelve, con o sin CLI.

## Consecuencias

- Se agregan como dependencias: `radix-ui` (paquete unificado, ver
  changelog de shadcn/ui de febrero 2026), `class-variance-authority`,
  `clsx`, `tailwind-merge`, `@mynaui/icons-react`.
- `components.json` nuevo en `apps/frontend`, con el registro
  `@mynaui` agregado para poder consultar sus bloques como referencia
  (`npx shadcn view @mynaui/dialog4`) sin instalarlos.
- `src/index.css` gana las variables de tema de shadcn/ui
  (`@theme inline`, tokens `--background`, `--primary`, etc.).
- El kit queda en dos capas: primitivos vendorizados en
  `src/components/ui/base/` (shadcn/ui) y componentes propios
  (`DataTable.tsx`, `SearchInput.tsx`, `Field.tsx`, `EmptyState.tsx`,
  `ErrorState.tsx`) que se apoyan en ellos. El `cn()` de las clases de
  Tailwind es el paquete `cn` que genera el `init` de shadcn (`clsx` +
  `tailwind-merge`), no un helper propio.
- `/kitchen-sink` (`src/dev/KitchenSinkPage.tsx`) muestra todas las
  variantes de los componentes del kit.
- `StatusBadge` (FE-03) se construye sobre el `Badge` de shadcn/ui.
- Los bloques numerados de MynaUI (`dialog1`…`6`, `table1`…`5`,
  `button1`…`5`, `emptystates1`…`5`, etc.) quedan documentados acá como
  **referencia de diseño para las pantallas de feature** (FE-05 a
  FE-10), no como código a instalar.

## Anexo: paleta real de QualityTrack (2026-09-19)

> **Corregido el mismo día, ver "Anexo: paleta corregida" más abajo.**
> Lo que sigue quedó mal: `--color-accent`, `--color-accent-2` y la
> escala de neutrales son los tokens **placeholder** del skill de
> diseño de Claude ("swap this for your brand"), nunca reemplazados por
> la diseñadora -- no son la marca real de QualityTrack. Se dejan acá
> como registro de por qué la primera vuelta de `src/index.css` estaba
> mal, no como referencia a usar.

El diseño de QualityTrack (mockup en `claude.ai/design`, publicado como
Artifact) define una paleta propia, extraída y aplicada a `src/index.css`
y a `base/alert.tsx` / `base/button.tsx`:

**Marca:** `--color-accent: #5980a6` (escala 100→900 de `#eef6ff` a
`#1d2d3d`), `--color-accent-2: #728fab` (uso a definir -- no se mapeó a
ningún token de shadcn/ui todavía). **Neutrales:** `#f5f5f8` → `#2b2b2d`
(9 pasos). **Base:** `bg: #f2f2f3`, `surface: #e9e9ea`, `text: #1d1f20`.
**Radios:** `sm: 2px`, `md: 4px`, `lg: 7px` (mucho más angulosos que el
default de shadcn/ui).

**Paleta de estados** (`S` en el mockup, una función `badge(key)` para
todos los estados de `WORK_ORDER` y `QUOTE` -- esta es la referencia que
FE-03 (`domain/workOrderStatus`, `StatusBadge`) debe usar en vez de
inventar colores nuevos):

| Tono                      | texto     | fondo     | borde     | Estados que lo usan                                                |
| ------------------------- | --------- | --------- | --------- | ------------------------------------------------------------------ |
| Neutro (`pending`)        | `#3c4a63` | `#eef2f8` | `#cfd8e6` | `pending`, `cancelled`, `closed` (~`created`/`routed`/`cancelled`) |
| Ámbar (`route`/`quality`) | `#6b4200` | `#fff4e0` | `#f5c37b` | `route`, `quality`, `waiting` (~`routed`/`in_quality_control`)     |
| Azul (`production`)       | `#0043ce` | `#edf5ff` | `#a6c8ff` | `production`, `quoted` (~`in_production`)                          |
| Verde (`conforme`)        | `#0b6b41` | `#e7f6ee` | `#9bd8b8` | `conforme`, `delivered`, `approved`, `evaluated`                   |
| Rojo (`rejected`)         | `#8e1225` | `#fdf1f3` | `#f3c4cb` | `rejected` (~`nonconforming`)                                      |

Nota: las claves del mockup (`route`, `production`, `quality`,
`conforme`, `rejected`) no calzan 1 a 1 con los valores de
`WORK_ORDER.status` de `docs/architecture.md` (`created`, `routed`,
`in_production`, `in_quality_control`, `nonconforming`, `delivered`,
`cancelled`) -- son nombres de la maqueta, no del backend. El mapeo
final estado→tono queda para FE-03.

El botón "Cancelar OT" del mockup usa un rojo **sólido** distinto al del
badge de rechazo: `#c8102e` (hover `#a20d25`).

## Anexo: paleta corregida (2026-09-19)

El anexo anterior tomó los tokens `--color-*` del `:root` del artifact,
que resultaron ser el placeholder sin marcar del skill de diseño, no la
paleta real. La evidencia confiable es la que la diseñadora compartió
después: una captura de la pantalla Comercial ya renderizada, una hoja
de componentes (botones/badges/nav en sus variantes), y una tabla
"Paleta Básica WCAG para Quality Track" con roles mapeados a shades de
Tailwind.

Esa tabla tiene un problema real, no solo de gusto: usa el mismo shade
(`/600`, `/500`) para familias de color distintas, y `amber/500` con
texto blanco encima (como el swatch "En Calidad" de la hoja de
componentes) da un contraste ~2:1 -- muy por debajo del 4.5:1 de WCAG
AA. El resto de los `/600` (`blue`, `emerald`, `rose`) sí pasa.

**Paleta final, Tailwind estándar (no hex propios):**

| Rol                                  | Token                                                                                             | Uso                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Primary                              | `blue-600`                                                                                        | Botón primario, tab/nav activa -- coincide con la captura  |
| Success                              | `emerald-600`                                                                                     | Conforme / Entregada                                       |
| Warning                              | `amber-800` sobre `amber-100` (tenue); `amber-500` solo decorativo, nunca con texto blanco encima | Corrige el fallo de contraste de la tabla de la diseñadora |
| Destructive                          | `rose-600`, hover `rose-700`                                                                      | Cancelar OT / Rechazada                                    |
| Neutral (texto)                      | `slate-900`                                                                                       |                                                            |
| Neutral (fondo de página)            | blanco liso, sin tono de "surface" separado                                                       | La captura muestra el área de contenido en blanco          |
| Neutral (sidebar/superficies tenues) | `slate-50`                                                                                        | El lavanda pálido del sidebar en la captura                |
| Bordes                               | `slate-200`                                                                                       |                                                            |

Aplicado en `src/index.css` (`:root`, tokens de shadcn/ui) y
`base/alert.tsx` (variantes `info`/`success`/`warning`/`destructive`).
`base/button.tsx` además pasa de `rounded-lg` a `rounded-full`: los
botones de la captura son píldora completa, no la esquina redondeada
por defecto de shadcn/ui.

La paleta de 5 estados semánticos del anexo anterior (`pending`/
`route`/`production`/`quality`/`conforme`/`rejected`, con sus hex) queda
igual de cuestionada por el mismo motivo -- **no usar esos hex para
FE-03**. El mapeo estado→tono de `StatusBadge` debería salir de esta
tabla corregida (`success`→conforme/entregada, `warning`→en ruta/en
calidad, `info`→en producción, `destructive`→no conforme/cancelada,
neutral→pendiente/cerrada), no de los valores extraídos del mockup.

## Action Items

1. [x] `npx shadcn@latest init --template vite -b radix -y` en
       `apps/frontend`.
2. [x] Agregar el registro `@mynaui` a `components.json`.
3. [x] Instalar los primitivos: `button`, `badge`, `alert`, `tabs`,
       `dialog`, `table`, `pagination`, `skeleton`, `input`, `label`.
4. [x] `pnpm --filter frontend add @mynaui/icons-react`.
5. [x] Escribir `Table`, `SearchInput`, `Field`, `EmptyState`,
       `ErrorState` sobre los primitivos nuevos.
6. [x] Escribir los tests de render de cada componente.
7. [x] Actualizar `/kitchen-sink` y el cuerpo de la issue #67 en
       GitHub.
8. [x] Ubicar los primitivos en `src/components/ui/base/` y apuntar el
       alias `ui` de `components.json` ahí, para separar lo vendorizado
       de `DataTable`/`Field`/`SearchInput`/`EmptyState`/`ErrorState`.
9. [ ] Cuando se implemente `ClientCombobox` (FE-05b), evaluar sumar el
       primitivo `Select`/`Command` de shadcn/ui en vez de escribirlo a
       mano — mismo razonamiento que este ADR.

## Decisiones relacionadas

- Issue #67: esta ADR documenta la decisión de stack de UI con la que
  se implementa; su cuerpo en GitHub refleja el resultado final.
- `docs/frontend-structure.md` §0 y §7: se actualiza la fila de stack
  ("Tailwind CSS v4" pasa a "Tailwind CSS v4 + shadcn/ui (Radix UI) +
  MynaUI") y los criterios de aceptación de FE-02.
- ADR-0004: no se modifica el stack de backend ni las decisiones de
  lenguaje/framework; esta ADR es exclusiva del frontend.
