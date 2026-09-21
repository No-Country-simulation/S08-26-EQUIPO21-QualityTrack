import { useState, type ReactNode } from 'react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  SearchInput,
  Skeleton,
  Tabs,
  type DataTableColumn,
} from '@/components/ui';

const ALERT_VARIANTS = ['info', 'success', 'warning', 'destructive'] as const;
const BADGE_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'destructive',
] as const;
const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'ghost',
  'link',
] as const;

interface SampleRow {
  id: string;
  client: string;
  status: string;
}

const sampleColumns: DataTableColumn<SampleRow>[] = [
  { key: 'client', header: 'Cliente', render: (row) => row.client },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => <Badge variant="secondary">{row.status}</Badge>,
  },
];

const sampleRows: SampleRow[] = [
  { id: 'wo-1', client: 'ACME', status: 'routed' },
  { id: 'wo-2', client: 'Globex', status: 'in_production' },
];

/**
 * Página de desarrollo (no forma parte del flujo de negocio ni del Sidebar)
 * que muestra todas las variantes y estados del kit UI -- issue #67, sobre
 * shadcn/ui + MynaUI (ver ADR-0013). Sirve como checklist visual, no
 * reemplaza los tests de render por componente.
 */
export function KitchenSinkPage() {
  const [tableState, setTableState] = useState<'loading' | 'empty' | 'success'>(
    'success',
  );
  const [tab, setTab] = useState('primeros');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  return (
    <main className="flex flex-col gap-10 p-8">
      <h1 className="text-2xl font-semibold">Kit UI — kitchen sink</h1>

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
            <Alert key={variant} variant={variant}>
              <AlertTitle>Alert {variant}</AlertTitle>
              <AlertDescription>
                Mensaje de ejemplo para la variante {variant}.
              </AlertDescription>
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
          <Tabs.Panel value="primeros" className="p-4">
            Contenido de solicitudes.
          </Tabs.Panel>
          <Tabs.Panel value="segundos" className="p-4">
            Contenido de cotizaciones.
          </Tabs.Panel>
        </Tabs>
      </Section>

      <Section title="SearchInput">
        <div className="max-w-sm">
          <SearchInput onSearch={setSearch} />
          <p className="mt-2 text-xs text-muted-foreground">
            Último término buscado: {search || '(vacío)'}
          </p>
        </div>
      </Section>

      <Section title="Field">
        <div className="flex max-w-sm flex-col gap-4">
          <Field label="Cliente" hint="Buscá por nombre o CUIT">
            <Input />
          </Field>
          <Field label="Email" required error="Formato de email inválido">
            <Input />
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

      <Section title="DataTable">
        <div className="mb-3 flex gap-2">
          <Button
            size="sm"
            variant={tableState === 'success' ? 'default' : 'outline'}
            onClick={() => setTableState('success')}
          >
            con datos
          </Button>
          <Button
            size="sm"
            variant={tableState === 'loading' ? 'default' : 'outline'}
            onClick={() => setTableState('loading')}
          >
            cargando
          </Button>
          <Button
            size="sm"
            variant={tableState === 'empty' ? 'default' : 'outline'}
            onClick={() => setTableState('empty')}
          >
            vacía
          </Button>
        </div>
        <DataTable
          columns={sampleColumns}
          rows={tableState === 'empty' ? [] : sampleRows}
          getRowKey={(row) => row.id}
          isLoading={tableState === 'loading'}
        />
      </Section>

      <Section title="Pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage((current) => Math.max(1, current - 1));
                }}
              />
            </PaginationItem>
            {[1, 2, 3].map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href="#"
                  isActive={page === pageNumber}
                  onClick={(event) => {
                    event.preventDefault();
                    setPage(pageNumber);
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage((current) => Math.min(3, current + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Cancelar OT</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar orden de trabajo</DialogTitle>
              <DialogDescription>
                Esta acción es terminal (ADR-0006). Ingresá un motivo antes de
                confirmar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive">Confirmar cancelación</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
