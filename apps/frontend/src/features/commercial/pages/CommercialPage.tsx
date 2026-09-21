import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button, ErrorState, SearchInput, Tabs } from '@/components/ui';

import { NewQuoteDialog } from '../components/NewQuoteDialog';
import { NewRequestDialog } from '../components/NewRequestDialog';
import { QuotesTable } from '../components/QuotesTable';
import { RequestsTable } from '../components/RequestsTable';
import { useCommercialPanel } from '../hooks';
import type { RequestSummary } from '../types';

const TABS = {
  requests: 'requests',
  quotes: 'quotes',
} as const;

function matchesSearch(term: string, ...values: string[]): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => value.toLowerCase().includes(needle));
}

export function CommercialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RequestSummary | null>(
    null,
  );
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  const activeTab =
    searchParams.get('tab') === TABS.quotes ? TABS.quotes : TABS.requests;

  function setActiveTab(tab: string) {
    setSearchParams((params) => {
      params.set('tab', tab);
      return params;
    });
  }

  const { data, isLoading, isError, error, refetch } = useCommercialPanel();

  const filteredRequests = useMemo(
    () =>
      (data?.requestsPendingQuote ?? []).filter((request) =>
        matchesSearch(search, request.id, request.customer.name),
      ),
    [data, search],
  );

  const filteredQuotes = useMemo(
    () =>
      (data?.quotesPendingApproval ?? []).filter((quote) =>
        matchesSearch(search, quote.id, quote.request.customer.name),
      ),
    [data, search],
  );

  return (
    <main className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">¿Qué vamos a cotizar hoy?</h1>
        <SearchInput
          onSearch={setSearch}
          placeholder="Buscar cliente, OT o pieza"
          className="w-full sm:w-72"
        />
      </div>

      <Button onClick={() => setNewRequestOpen(true)} className="w-fit">
        + Nueva solicitud
      </Button>

      {isError ? (
        <ErrorState
          title="No se pudo cargar el panel comercial"
          description={error.message}
          onRetry={() => refetch()}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List aria-label="Solicitudes y cotizaciones">
            <Tabs.Trigger value={TABS.requests}>Solicitudes</Tabs.Trigger>
            <Tabs.Trigger value={TABS.quotes}>Cotizaciones</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Panel value={TABS.requests} className="pt-4">
            <RequestsTable
              requests={filteredRequests}
              isLoading={isLoading}
              onCreateQuote={setSelectedRequest}
            />
          </Tabs.Panel>
          <Tabs.Panel value={TABS.quotes} className="pt-4">
            <QuotesTable quotes={filteredQuotes} isLoading={isLoading} />
          </Tabs.Panel>
        </Tabs>
      )}

      <NewQuoteDialog
        request={selectedRequest}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}
      />
      <NewRequestDialog
        open={newRequestOpen}
        onOpenChange={setNewRequestOpen}
      />
    </main>
  );
}
