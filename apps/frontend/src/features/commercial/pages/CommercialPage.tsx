import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button, ErrorState, SearchInput, Tabs } from '@/components/ui';

import { NewQuoteDialog } from '../components/NewQuoteDialog';
import { NewRequestDialog } from '../components/NewRequestDialog';
import { QuoteDetailDialog } from '../components/QuoteDetailDialog';
import { QuotesTable } from '../components/QuotesTable';
import { RequestsTable } from '../components/RequestsTable';
import { useQuotes, useRequests } from '../hooks';
import type { QuoteSummary, RequestSummary } from '../types';

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
  const [selectedQuote, setSelectedQuote] = useState<QuoteSummary | null>(null);
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  const activeTab =
    searchParams.get('tab') === TABS.quotes ? TABS.quotes : TABS.requests;

  function setActiveTab(tab: string) {
    setSearchParams((params) => {
      params.set('tab', tab);
      return params;
    });
  }

  const requests = useRequests();
  // Todas las cotizaciones, sin filtro -- alimenta la tab de Cotizaciones
  // (todas, con "aprobar/rechazar" o "ver detalle" según el estado de
  // cada una) y el cruce con Solicitudes (para saber si una solicitud
  // ya tiene cotización, y de qué estado).
  const quotes = useQuotes();

  const quotesByRequestId = useMemo(() => {
    const map = new Map<string, QuoteSummary>();
    for (const quote of quotes.data ?? []) {
      map.set(quote.requestId, quote);
    }
    return map;
  }, [quotes.data]);

  const filteredRequests = useMemo(
    () =>
      (requests.data ?? []).filter((request) =>
        matchesSearch(search, request.id, request.customer.name, request.piece),
      ),
    [requests.data, search],
  );

  const filteredQuotes = useMemo(
    () =>
      (quotes.data ?? []).filter((quote) =>
        matchesSearch(
          search,
          quote.id,
          quote.request.customer.name,
          quote.request.piece,
        ),
      ),
    [quotes.data, search],
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List aria-label="Solicitudes y cotizaciones">
          <Tabs.Trigger value={TABS.requests}>Solicitudes</Tabs.Trigger>
          <Tabs.Trigger value={TABS.quotes}>Cotizaciones</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Panel value={TABS.requests} className="pt-4">
          {requests.isError ? (
            <ErrorState
              title="No se pudieron cargar las solicitudes"
              description={requests.error.message}
              onRetry={() => requests.refetch()}
            />
          ) : (
            <RequestsTable
              requests={filteredRequests}
              isLoading={requests.isLoading}
              quotesByRequestId={quotesByRequestId}
              onCreateQuote={setSelectedRequest}
              onViewQuote={setSelectedQuote}
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel value={TABS.quotes} className="pt-4">
          {quotes.isError ? (
            <ErrorState
              title="No se pudieron cargar las cotizaciones"
              description={quotes.error.message}
              onRetry={() => quotes.refetch()}
            />
          ) : (
            <QuotesTable
              quotes={filteredQuotes}
              isLoading={quotes.isLoading}
              onViewDetail={setSelectedQuote}
            />
          )}
        </Tabs.Panel>
      </Tabs>

      <NewQuoteDialog
        request={selectedRequest}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}
      />
      <QuoteDetailDialog
        quote={selectedQuote}
        onOpenChange={(open) => {
          if (!open) setSelectedQuote(null);
        }}
      />
      <NewRequestDialog
        open={newRequestOpen}
        onOpenChange={setNewRequestOpen}
      />
    </main>
  );
}
