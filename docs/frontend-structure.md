# Arquitectura Frontend — QualityTrack

Documento de referencia para `apps/frontend`. Reescribe y corrige `frontend-breakdown.md`.
**Restricción del proyecto: 3 semanas.** Todo lo marcado `[v2]` queda explícitamente fuera del MVP.

---

## 0. Decisiones base

| Tema        | Decisión                                                                                                                                                |
| :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack       | React + TypeScript + Vite, Tailwind CSS v4 + shadcn/ui (Radix UI) + MynaUI (iconos y referencia de diseño — ver ADR-0013)                               |
| Datos       | TanStack Query (server state) · Zustand acotado a sesión/auth (usuario, rol, token, permisos) — no para datos de negocio, esos los cubre TanStack Query |
| Rutas       | React Router con rutas protegidas por rol (login real)                                                                                                  |
| Formularios | React Hook Form + Zod, un esquema por formulario, reutilizado como tipo                                                                                 |
| Fechas      | `date-fns` con locale `es`                                                                                                                              |
| Tests       | Vitest + Testing Library solo en: máquina de estados, validación de formularios y `TimelineView`                                                        |

---

## 1. Estructura de carpetas (`apps/frontend/src`)

```
src/
├── app/
│   ├── api/
│   │   ├── client.ts              # Instancia Axios, baseURL, interceptor de auth y de errores
│   │   └── queryKeys.ts           # Fábrica central de query keys (evita invalidaciones erráticas)
│   ├── auth/
│   │   ├── authStore.ts           # Zustand: usuario, rol, token, permisos — único store del MVP
│   │   ├── AuthProvider.tsx       # Wiring: hidrata authStore al login/refresh, limpia QueryClient al logout
│   │   ├── RequireRole.tsx        # Guard de ruta por rol (lee de authStore)
│   │   └── permissions.ts         # Funciones puras: canCancelWorkOrder(user), canApproveQuote(user)…
│   ├── providers/AppProviders.tsx # QueryClient + Router + Auth + ToastProvider
│   └── routes.tsx                 # Árbol de rutas y lazy imports por feature
├── domain/                        # Reglas de negocio compartidas, sin React
│   ├── workOrderStatus.ts         # Máquina de estados: label ES, color, transiciones, acciones
│   ├── quoteStatus.ts
│   └── inspection.ts             # attemptNumber(history), MAX_ATTEMPTS = 3
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx          # Sidebar + header + <Outlet/> con scroll independiente
│   │   ├── Sidebar.tsx            # Links filtrados por rol del usuario autenticado
│   │   └── UserBadge.tsx
│   └── ui/                        # Kit atómico — FE-02, sobre shadcn/ui + MynaUI (ADR-0013)
│       ├── base/                  # Primitivos de shadcn/ui, vendorizados por su CLI --
│       │   ├── alert.tsx  badge.tsx  button.tsx  dialog.tsx  input.tsx  # no se editan a mano
│       │   └── label.tsx  pagination.tsx  skeleton.tsx  table.tsx  tabs.tsx  # salvo casos puntuales (ver alert.tsx)
│       ├── DataTable.tsx  EmptyState.tsx  ErrorState.tsx  Field.tsx  SearchInput.tsx  # propios -- sin equivalente en shadcn/ui ni MynaUI
│       ├── Tabs.tsx               # propio -- wrapper de base/tabs.tsx (sí tiene equivalente, ver nota)
│       ├── StatusBadge.tsx        # Badge alimentado por domain/*Status — no duplica colores
│       └── index.ts               # barrel -- única puerta de entrada para las features
├── features/
│   ├── dashboard/                 # Home: KPIs + actividad reciente
│   │   ├── api.ts  hooks.ts  types.ts
│   │   ├── components/{KpiTile,StatusBreakdown,RecentActivity}.tsx
│   │   └── DashboardPage.tsx
│   ├── commercial/
│   │   ├── api.ts                 # getRequests, getQuotes, createRequest, createQuote, approveQuote
│   │   ├── hooks.ts               # useRequests, useQuotes, useCreateRequest…
│   │   ├── schemas.ts             # Zod: newRequestSchema, newQuoteSchema
│   │   ├── types.ts
│   │   ├── components/{RequestsTable,QuotesTable,NewRequestDialog,NewQuoteDialog}.tsx
│   │   └── CommercialPage.tsx
│   ├── clients/                  # Transversal: lo consume comercial (y el CRUD futuro)
│   │   ├── api.ts  hooks.ts  schemas.ts  types.ts
│   │   ├── components/ClientCombobox.tsx
│   │   └── (sin página propia en el MVP)
│   ├── production/
│   │   ├── api.ts  hooks.ts  schemas.ts  types.ts
│   │   ├── components/{WorkOrderHeader,TechnicalSpecsViewer,RouteSheetList,OperationItem,CancelWorkOrderDialog}.tsx
│   │   └── ProductionPage.tsx
│   ├── quality/
│   │   ├── api.ts  hooks.ts  schemas.ts  types.ts
│   │   ├── components/{ReprocessAlert,ChecklistEvaluation,EvidenceUploader,InspectionDecision}.tsx
│   │   └── QualityPage.tsx
│   └── traceability/              # Expediente único (antes "dossier")
│       ├── api.ts  hooks.ts  types.ts
│       ├── components/{DossierHeaderCard,ReplacementBanner,TimelineView,CommercialSummaryTab,OperationsTab,DocumentsTab}.tsx
│       └── DossierPage.tsx
└── types/api.ts                   # SOLO tipos generados/compartidos del contrato (enums de estado, paginación)
```

`ui/` envuelve un primitivo de `base/` por dos motivos distintos, no uno
solo:

- **Sin equivalente** (`DataTable`, `Field`, `SearchInput`,
  `EmptyState`, `ErrorState`): la librería no ofrece nada parecido, se
  escribe directo sobre las piezas de `base/`.
- **Con equivalente, pero con identidad visual propia** (`Tabs`): el
  primitivo de shadcn/ui existe y funciona, pero su estilo por defecto
  (segmented control) no es el de QualityTrack (subrayado, en
  `--primary`). El wrapper mantiene la API del primitivo por debajo
  (mismo `value`/`onValueChange`; Radix resuelve foco/teclado) y solo
  fija el estilo con los tokens de `src/index.css`.

Si `Button`, `Badge` o `Dialog` necesitan en algún momento algo que un
override de clases vía `className` no alcance a resolver limpio, siguen
este mismo patrón — no se reescriben desde cero.

### Qué cambió respecto a la propuesta original y por qué

1. **`features/*/api.ts` añadido.** La propuesta tenía `hooks/` pero no dónde vivían las llamadas HTTP. Separar funciones puras (`api.ts`) de la orquestación de caché (`hooks.ts`) hace que un cambio de contrato del backend toque un archivo por feature.
2. **`domain/` nuevo.** Los estados (`created → routed → in_production → in_quality_control → nonconforming → delivered | cancelled`) son el núcleo del producto, no un detalle visual del `Badge`. Un solo módulo define label, color, transiciones válidas y acciones habilitadas; Producción, Calidad, Dossier y Home lo consumen. Sin esto la lógica se duplica en cuatro pantallas.
3. **`types/` global adelgazado.** Los DTOs de cotización solo los usan Comercial y Trazabilidad → `features/*/types.ts`. En `types/api.ts` queda únicamente el contrato compartido.
4. **`dossier` → `traceability`.** No es "la pantalla 4": es la vista transversal y el criterio de éxito del MVP. Sus pestañas reutilizan componentes de las otras features en vez de mantener resúmenes paralelos.
5. **`Modal` → `Dialog`**, y `Skeleton` / `EmptyState` / `ErrorState` / `Pagination` incorporados al kit. Estaban ausentes y son el 30% del trabajo real de cada tabla.
6. **`app/auth/` nuevo.** Con login real y 4 roles, los permisos no pueden vivir en el `Sidebar`: `permissions.ts` decide si el botón "Cancelar OT" existe y `RequireRole` protege la ruta.
7. **`authStore.ts` (Zustand) nuevo.** Es el único store del MVP — no reemplaza a TanStack Query, que sigue siendo la fuente de verdad para datos de negocio. Se justifica porque el interceptor de `client.ts` necesita leer el token **fuera del árbol de React**, algo que un Context no resuelve sin prop-drilling. `AuthProvider.tsx` queda como wiring delgado (hidratar el store, limpiar la caché de queries al logout); `permissions.ts` sigue siendo funciones puras que reciben el snapshot del store, para poder testearlas sin React. Si el backend habilita RBAC con una matriz de permisos real, esa matriz se trae con TanStack Query (server state) y solo el snapshot resuelto se sincroniza al `authStore` — no se duplica ahí como fuente de verdad. Un `RequirePermission` genérico (reemplazando `RequireRole`) queda fuera de este documento hasta que el RBAC del backend esté definido: generalizar antes sería especular sobre una forma que todavía no existe.

---

## 2. Rutas y permisos

| Ruta                       | Pantalla                     | Roles con acceso                         |
| :------------------------- | :--------------------------- | :--------------------------------------- |
| `/`                        | Dashboard (KPIs + actividad) | todos                                    |
| `/commercial`              | Solicitudes y cotizaciones   | comercial, admin                         |
| `/production`              | Tablero de OT y hoja de ruta | planta, admin                            |
| `/quality`                 | Formulario de inspección     | calidad, admin                           |
| `/work-orders/:id/dossier` | Expediente único             | auditoría, admin (lectura para el resto) |
| `/login`                   | Autenticación                | público                                  |

Regla: el Sidebar **oculta** lo no permitido y la ruta además lo **bloquea** (nunca solo una de las dos cosas). Acciones destructivas (cancelar OT, aprobar cotización) se esconden vía `permissions.ts`, no con condicionales sueltos en el JSX.

---

## 3. Componentización por vista

Tres niveles, siempre: **página** (orquesta y lee la URL), **secciones** (leen datos vía hooks), **presentacionales** (tontas, viven en `components/ui` y no saben de negocio).

Reglas que aplican a las cuatro vistas:

- **`DataTable` genérico, tablas específicas no.** Las cuatro vistas repiten la misma tabla (ID, cliente, pieza, fecha, estado, acción). El genérico recibe `columns` **como datos**, no como JSX suelto; cada feature solo aporta su `columns[]` y el mapeo estado → acción.
- **`StatusBadge` nunca recibe `color` ni `label`**, solo `status`, y los saca de `domain/`. Pasarle un color duplica la máquina de estados en cada tabla — el fallo que tenía el mock (verde "Conforme" usado como estado de operación).
- **La tab activa vive en la URL** (`?tab=quotes`), no en `useState`: así el enlace del Home a "solicitudes sin cotizar" puede apuntar a la pestaña correcta.
- **Una fila no es un componente.** `RequestRow`, `OperationRow` y compañía son entradas de un `columns[]`, no archivos.

### 3.1 Comercial

```
CommercialPage                     ← ruta, tab en URL, búsqueda con debounce
├── PageHeader                     ← compartido: título + SearchInput + acción primaria
├── Tabs                           ← compartido (ui/)
├── RequestsTable                  ← useRequests(); columnas y acción por fila
│   └── DataTable                  ← compartido: columns[], rows[], isLoading, emptyState
│       ├── StatusBadge
│       └── RowAction              ← primaria vs. discreta
├── QuotesTable                    ← useQuotes(); misma composición, otro columns[]
└── NewRequestDialog               ← RHF + Zod
    └── ClientCombobox             ← de features/clients/: buscar o crear cliente
```

| Componente                      | Props                                  | Estado propio                            |
| :------------------------------ | :------------------------------------- | :--------------------------------------- |
| `CommercialPage`                | —                                      | ninguno (tab en URL, búsqueda debounced) |
| `RequestsTable` / `QuotesTable` | `search`                               | ninguno (React Query)                    |
| `DataTable`                     | `columns, rows, isLoading, emptyState` | ninguno                                  |
| `StatusBadge`                   | `status`                               | ninguno                                  |
| `NewRequestDialog`              | `open, onClose`                        | RHF + Zod                                |
| `ClientCombobox`                | `value, onChange` (RHF controller)     | query de búsqueda, modo crear            |

`ClientCombobox` vive en `features/clients/`, no en `commercial/`: lo necesita también la creación de cotizaciones y el CRUD futuro. Es el único componente de la vista con lógica real (debounce, modo "crear", navegación por teclado) y el único que merece test.

**No componentizar todavía:** `RequestRow`, un `Tab` individual, un `FormField` propio (usa `Field` del kit), ni `CommercialFilters` — con búsqueda y dos tabs no hay nada que abstraer.

**Orden de construcción (2–3 días):** `DataTable` + `StatusBadge` + `Tabs` → `RequestsTable` con mocks → `QuotesTable` (copia con otro `columns[]`) → `NewRequestDialog` → `ClientCombobox` al final; el modal funciona con un `<input>` de texto mientras tanto.

### 3.2 Producción

```
ProductionPage                     ← ruta; ?tab= y ?ot= en URL
├── PageHeader
├── Tabs                           ← Pendientes / En producción / En calidad
├── WorkOrdersTable → DataTable
└── WorkOrderDetail                ← misma ruta, no una ruta nueva
    ├── DetailFactsCard            ← compartido con Calidad y Expediente
    ├── TechnicalSpecsPanel
    │   └── DocumentChip
    ├── RouteSheet                 ← useOperations(); calcula la operación accionable
    │   ├── OperationRow           ← Iniciar / Completar / reordenar / eliminar
    │   └── AddOperationForm       ← inline, no un modal
    └── CancelWorkOrderDialog      ← motivo obligatorio (≥10 caracteres)
```

La regla de secuencia (**solo la siguiente pendiente es accionable**) se calcula en `RouteSheet`, nunca en `OperationRow`: la fila recibe `canStart` y `canComplete` ya resueltos. Es la única forma de que la validación no se duplique por fila.

### 3.3 Calidad

```
QualityPage                        ← ruta; ?tab= y ?ins= en URL
├── PageHeader
├── Tabs                           ← Pendientes / Evaluadas / Rechazadas
├── InspectionsTable → DataTable
└── InspectionDetail
    ├── DetailFactsCard            ← reutilizado de Producción
    ├── ReprocessAlert             ← props: attempt, maxAttempts, rejections
    ├── ChecklistForm              ← items con tolerancia + observaciones
    ├── EvidenceUploader           ← dropzone + miniaturas
    └── InspectionDecision         ← Conforme / No conforme + defectDetail obligatorio
```

`attemptNumber` y `MAX_ATTEMPTS = 3` salen de `domain/inspection.ts`. `InspectionDecision` **no** conoce la regla del tercer intento: recibe `isLastAttempt` y solo cambia el mensaje.

### 3.4 Expediente único

```
DossierPage
├── DossierHeaderCard → DetailFactsCard
├── ReplacementBanner              ← solo si replacesWorkOrderId != null
├── Tabs
└── CommercialSummaryTab | TimelineView | OperationsTab | DocumentsTab
```

`OperationsTab` reutiliza `DataTable` y `DocumentsTab` reutiliza `DocumentChip`. Si acabas escribiendo una tabla propia aquí, la abstracción de `DataTable` está mal hecha.

### 3.5 Qué acaba en el kit compartido

`DataTable`, `StatusBadge`, `Tabs`, `PageHeader`, `SearchInput`, `Dialog`, `Field`, `Button`, `RowAction`, `Skeleton`, `EmptyState`, `ErrorState`, `DetailFactsCard`, `DocumentChip`. Catorce componentes cubren las cinco pantallas: si aparece el decimoquinto, revisa si no es una variante de uno existente.

---

## 4. Pantallas

### 4.1 Dashboard (`/`) — nuevo, no estaba en el breakdown

- KPIs: OT en producción, en control de calidad, pendientes de ruta, compromisos en riesgo.
- Desglose de OT por estado con su código técnico visible (habla el idioma del backend).
- Actividad reciente = feed de `STATUS_HISTORY` global, cada entrada enlaza a su dossier.
- **Nota de alcance:** "compromisos en riesgo" necesita `dueDate` en el listado de OT. Si el backend no lo expone, se cae del MVP.

### 4.2 Comercial (`/commercial`)

Tabs Solicitudes / Cotizaciones · filtros por estado · búsqueda por cliente, ID o pieza · paginación · `NewRequestDialog` con validación Zod (cliente, email con formato, pieza, cantidad entera > 0) · acción contextual "Crear cotización" solo en solicitudes sin cotización previa · aprobar/rechazar cotización.

### 4.3 Producción (`/production`)

Chips de filtro por estado · `WorkOrderHeader` · `TechnicalSpecsViewer` con presigned URLs (ADR-0010) · `RouteSheetList` secuencial: solo la siguiente operación pendiente es accionable, el resto deshabilitado con tooltip del motivo · `CancelWorkOrderDialog` con `reason` obligatorio (ADR-0006) · aviso de la transición automática a `in_quality_control`.

### 4.4 Calidad (`/quality`)

`ReprocessAlert` con "Intento X de 3" calculado en `domain/inspection.ts` · checklist con tolerancias · `EvidenceUploader` (dropzone + miniaturas) · decisión Conforme / No Conforme, con `defectDetail` obligatorio solo en No Conforme · al llegar al intento 3 la UI avisa de que un rechazo cancela la OT (ADR-0002).

### 4.5 Expediente único (`/work-orders/:id/dossier`)

`DossierHeaderCard` · `ReplacementBanner` solo si `replacesWorkOrderId != null`, con enlace a la OT original · 4 pestañas (Resumen comercial, Línea de tiempo, Operaciones e inspecciones, Documentos) · `TimelineView` renderiza `STATUS_HISTORY` con estado, fecha, autor y motivo.

---

## 5. Contratos de estado transversales

Cada pantalla con datos remotos implementa los **cuatro** estados, sin excepción: `loading` (Skeleton con la forma del contenido, no spinner), `empty` (`EmptyState` con acción sugerida), `error` (`ErrorState` con reintento) y `success`. Los errores de negocio del backend (operación fuera de orden, intento 4 de 3, OT ya cancelada) se muestran como `Alert` en contexto, no como toast genérico.

---

## 6. Backlog

| Issue      | Tipo     | Título                                                              | Sem. |
| :--------- | :------- | :------------------------------------------------------------------ | :--- |
| **FE-01**  | `[TASK]` | Shell: AppLayout, Sidebar por rol, UserBadge                        | 1    |
| **FE-02**  | `[TASK]` | Kit UI atómico + página `/kitchen-sink`                             | 1    |
| **FE-03**  | `[TASK]` | `domain/workOrderStatus` + `StatusBadge` + cliente API y query keys | 1    |
| **FE-04**  | `[TASK]` | Auth, guard de rutas y `permissions.ts`                             | 1    |
| **FE-05**  | `[TASK]` | Comercial: listados, búsqueda, alta de solicitud y cotización       | 2    |
| **FE-05b** | `[TASK]` | `ClientCombobox`: buscar o crear cliente en el alta                 | 2    |
| **FE-06**  | `[TASK]` | Producción: tablero de OT, visor técnico y hoja de ruta             | 2    |
| **FE-07**  | `[TASK]` | Calidad: inspección, evidencia y reprocesos                         | 2–3  |
| **FE-08**  | `[TASK]` | Expediente único: cabecera, banner y línea de tiempo                | 3    |
| **FE-09**  | `[TASK]` | Estados de carga, vacío y error en las 5 pantallas                  | 3    |
| **FE-10**  | `[TASK]` | Dashboard: KPIs y actividad reciente                                | 3    |

**Orden crítico:** FE-01→04 antes de cualquier feature. Si la semana 3 aprieta, se recorta en este orden: FE-05b (el campo Cliente queda como texto libre, asumiendo el riesgo de duplicados), FE-10 (dashboard → enlace directo a Comercial), pestañas C y D del dossier, `EvidenceUploader` (se acepta sin fotos).

`[v2]` fuera del MVP: notificaciones en tiempo real, exportación del dossier a PDF, edición de hojas de ruta plantilladas, modo offline en planta, i18n.

---

## 7. Criterios de aceptación de los issues estructurales

**FE-02 · Kit UI.** Primitivos de shadcn/ui (base Radix UI, ver ADR-0013): `Button` (default, secondary, destructive, outline, ghost, link) · `Badge` · `Alert` (default, destructive, info, success, warning) · `Dialog` accesible: foco atrapado, `Esc` cierra, foco devuelto al disparador (resuelto por Radix) · `Pagination` · `Skeleton` · `Input` / `Label`. Propios sobre esos primitivos: `DataTable` (columnas como datos), `SearchInput` con debounce de 300 ms, `Field`, `EmptyState`, `ErrorState` (sin equivalente en shadcn/ui ni MynaUI), y `Tabs` (sí tiene equivalente, pero envuelto con el estilo subrayado de QualityTrack sobre los tokens de `--primary` en vez del segmented control por defecto; navegable por teclado con flechas + Home/End, resuelto por Radix). `StatusBadge` (FE-03) se construye sobre el `Badge` de shadcn/ui, tipado desde `domain` — sin colores hard-coded en las features. `/kitchen-sink` muestra todas las variantes y estados.

**FE-03 · Máquina de estados.** `statusMeta(status)` devuelve label ES, código técnico y color; `canTransition(from, to)` y `actionsFor(status, role)` con tests unitarios. Ningún componente compara strings de estado a mano.

**FE-04 · Auth y permisos.** Login persiste sesión en `authStore` (Zustand); recarga mantiene el rol; entrar a una ruta no permitida redirige al dashboard con aviso; el 401 del interceptor de `client.ts` lee el token directo del store (sin pasar por React), cierra la sesión y vuelve a `/login`.
