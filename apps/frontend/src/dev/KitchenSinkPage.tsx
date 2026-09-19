import { useState, type ReactNode } from 'react';

import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Pagination,
  SearchInput,
  Skeleton,
  Table,
  Tabs,
  type AlertVariant,
  type BadgeVariant,
  type ButtonVariant,
  type TableColumn,
} from '@/components/ui';

const ALERT_VARIANTS: AlertVariant[] = ['info', 'success', 'warning', 'danger'];
const BADGE_VARIANTS: BadgeVariant[] = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
];
const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'destructive',
  'outline',
];

interface SampleRow {
  id: string;
  client: string;
  status: string;
}

const sampleColumns: TableColumn<SampleRow>[] = [
  { key: 'client', header: 'Cliente', render: (row) => row.client },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => <Badge variant="info">{row.status}</Badge>,
  },
];

const sampleRows: SampleRow[] = [
  { id: 'wo-1', client: 'ACME', status: 'routed' },
  { id: 'wo-2', client: 'Globex', status: 'in_production' },
];

/**
 * Página de desarrollo (no forma parte del flujo de negocio ni del Sidebar)
 * que muestra todas las variantes y estados del kit UI atómico — issue #67.
 * Sirve como checklist visual, no reemplaza los tests de render por
 * componente.
 */
export function KitchenSinkPage() {
  const [tableState, setTableState] = useState<'loading' | 'empty' | 'success'>(
    'success',
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState('primeros');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  return (
    <main className="flex flex-col gap-10 p-8">
      <h1 className="text-2xl font-semibold text-gray-900">
        Kit UI — kitchen sink
      </h1>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
          <Button size="icon" aria-label="Acción">
            +
          </Button>
          <Button disabled>disabled</Button>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap items-center gap-3">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Alert">
        <div className="flex flex-col gap-3">
          {ALERT_VARIANTS.map((variant) => (
            <Alert key={variant} variant={variant} title={`Alert ${variant}`}>
              Mensaje de ejemplo para la variante {variant}.
            </Alert>
          ))}
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs value={tab} onValueChange={setTab}>
          <Tabs.List aria-label="Ejemplo de pestañas">
            <Tabs.Trigger value="primeros">Solicitudes</Tabs.Trigger>
            <Tabs.Trigger value="segundos">Cotizaciones</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Panel value="primeros" className="p-4 text-sm text-gray-600">
            Contenido de solicitudes.
          </Tabs.Panel>
          <Tabs.Panel value="segundos" className="p-4 text-sm text-gray-600">
            Contenido de cotizaciones.
          </Tabs.Panel>
        </Tabs>
      </Section>

      <Section title="SearchInput">
        <div className="max-w-sm">
          <SearchInput onSearch={setSearch} />
          <p className="mt-2 text-xs text-gray-500">
            Último término buscado: {search || '(vacío)'}
          </p>
        </div>
      </Section>

      <Section title="Field">
        <div className="flex max-w-sm flex-col gap-4">
          <Field label="Cliente" hint="Buscá por nombre o CUIT">
            <input className="rounded border border-gray-300 px-3 py-2 text-sm" />
          </Field>
          <Field label="Email" required error="Formato de email inválido">
            <input className="rounded border border-gray-300 px-3 py-2 text-sm" />
          </Field>
        </div>
      </Section>

      <Section title="Skeleton">
        <div className="flex max-w-sm flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="Sin solicitudes"
          description="Todavía no hay solicitudes cargadas."
          action={<Button size="sm">Nueva solicitud</Button>}
        />
      </Section>

      <Section title="ErrorState">
        <ErrorState
          description="No pudimos cargar las solicitudes."
          onRetry={() => {
            /* demo */
          }}
        />
      </Section>

      <Section title="Table">
        <div className="mb-3 flex gap-2">
          <Button
            size="sm"
            variant={tableState === 'success' ? 'primary' : 'outline'}
            onClick={() => setTableState('success')}
          >
            con datos
          </Button>
          <Button
            size="sm"
            variant={tableState === 'loading' ? 'primary' : 'outline'}
            onClick={() => setTableState('loading')}
          >
            cargando
          </Button>
          <Button
            size="sm"
            variant={tableState === 'empty' ? 'primary' : 'outline'}
            onClick={() => setTableState('empty')}
          >
            vacía
          </Button>
        </div>
        <Table
          columns={sampleColumns}
          rows={tableState === 'empty' ? [] : sampleRows}
          getRowKey={(row) => row.id}
          isLoading={tableState === 'loading'}
        />
      </Section>

      <Section title="Pagination">
        <Pagination page={page} totalPages={5} onPageChange={setPage} />
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setDialogOpen(true)}>Cancelar OT</Button>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Cancelar orden de trabajo"
        >
          <p className="mb-4 text-sm text-gray-600">
            Esta acción es terminal (ADR-0006). Ingresá un motivo antes de
            confirmar.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={() => setDialogOpen(false)}>
              Confirmar cancelación
            </Button>
          </div>
        </Dialog>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
