import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { createTestQueryClient } from '@/test/query-client';
import type { Customer } from '@/types/customer';

import { getQuotes, getRequests } from '../api';
import type { QuoteSummary, RequestSummary } from '../types';
import { CommercialPage } from './CommercialPage';

vi.mock('../api');
vi.mock('@/features/clients/api');
vi.mock('@/services/commercial');

const getRequestsMock = vi.mocked(getRequests);
const getQuotesMock = vi.mocked(getQuotes);

const CUSTOMER: Customer = {
  id: 'c1',
  name: 'Perdro Romero',
  taxId: 'ESY2468259R',
  email: 'pedro@empresa.test',
  phone: null,
  address: null,
  archivedAt: null,
};

const UNQUOTED: RequestSummary = {
  id: 'r1',
  customerId: 'c1',
  piece: 'Tornillo 45HK',
  quantity: 500,
  createdAt: '2026-09-21T10:00:00Z',
  customer: CUSTOMER,
};

const QUOTED_REQUEST: RequestSummary = {
  id: 'r2',
  customerId: 'c1',
  piece: 'Buje bronce 25mm',
  quantity: 8,
  createdAt: '2026-09-21T10:00:00Z',
  customer: CUSTOMER,
};

const QUOTE: QuoteSummary = {
  id: 'q1',
  requestId: 'r2',
  status: 'pending_approval',
  amount: '500.00',
  createdAt: '2026-09-21T10:00:00Z',
  updatedAt: '2026-09-21T10:00:00Z',
  request: QUOTED_REQUEST,
};

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <MemoryRouter initialEntries={['/commercial']}>
      <QueryClientProvider client={queryClient}>
        <CommercialPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getRequestsMock.mockResolvedValue([UNQUOTED, QUOTED_REQUEST]);
  getQuotesMock.mockResolvedValue([QUOTE]);
});

describe('CommercialPage', () => {
  it('arranca en la tab Solicitudes, cruzando el estado de la cotización por fila', async () => {
    renderPage();

    const requestsPanel = await screen.findByText('Tornillo 45HK');
    expect(requestsPanel).toBeInTheDocument();
    expect(screen.getByText('Sin cotizar')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Crear cotización' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver detalle' }),
    ).toBeInTheDocument();
  });

  it('cambia a la tab Cotizaciones y lista todas, con acción según estado', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Tornillo 45HK');

    await user.click(screen.getByRole('tab', { name: 'Cotizaciones' }));

    const quotesPanel = await screen.findByRole('tabpanel', {
      name: 'Cotizaciones',
    });
    expect(within(quotesPanel).getByText('Perdro Romero')).toBeInTheDocument();
    expect(
      within(quotesPanel).getByRole('button', { name: 'Aprobar' }),
    ).toBeInTheDocument();
  });

  it('la búsqueda filtra las solicitudes por pieza', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Tornillo 45HK');

    await user.type(screen.getByRole('searchbox'), 'Buje');

    // SearchInput debouncea 300ms antes de disparar onSearch -- se espera
    // con timers reales en vez de fake timers, que chocan con el polling
    // interno de `waitFor`.
    await waitFor(
      () => expect(screen.queryByText('Tornillo 45HK')).not.toBeInTheDocument(),
      { timeout: 1000 },
    );
    expect(screen.getByText('Buje bronce 25mm')).toBeInTheDocument();
  });

  it('muestra un error con reintentar si falla la carga de solicitudes', async () => {
    getRequestsMock.mockRejectedValue(
      new Error('No se pudieron cargar las solicitudes.'),
    );
    renderPage();

    expect(
      await screen.findByText('No se pudieron cargar las solicitudes.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('muestra un error con reintentar si falla la carga de cotizaciones', async () => {
    const user = userEvent.setup();
    getQuotesMock.mockRejectedValue(
      new Error('No se pudieron cargar las cotizaciones.'),
    );
    renderPage();
    await screen.findByText('Tornillo 45HK');

    await user.click(screen.getByRole('tab', { name: 'Cotizaciones' }));

    expect(
      await screen.findByText('No se pudieron cargar las cotizaciones.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('abre el diálogo de nueva solicitud desde el botón', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Tornillo 45HK');

    await user.click(screen.getByRole('button', { name: '+ Nueva solicitud' }));

    expect(
      screen.getByRole('dialog', { name: 'Nueva solicitud' }),
    ).toBeInTheDocument();
  });
});
