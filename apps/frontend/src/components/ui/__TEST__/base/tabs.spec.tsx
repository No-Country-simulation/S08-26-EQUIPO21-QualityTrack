import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../base/tabs';

function ExampleTabs() {
  return (
    <Tabs defaultValue="requests">
      <TabsList aria-label="Secciones de Comercial">
        <TabsTrigger value="requests">Solicitudes</TabsTrigger>
        <TabsTrigger value="quotes">Cotizaciones</TabsTrigger>
      </TabsList>
      <TabsContent value="requests">Contenido de solicitudes</TabsContent>
      <TabsContent value="quotes">Contenido de cotizaciones</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders only the panel matching the active value', () => {
    render(<ExampleTabs />);

    expect(screen.getByText('Contenido de solicitudes')).toBeInTheDocument();
    expect(
      screen.queryByText('Contenido de cotizaciones'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Solicitudes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches panel and selection on click', async () => {
    const user = userEvent.setup();
    render(<ExampleTabs />);

    await user.click(screen.getByRole('tab', { name: 'Cotizaciones' }));

    expect(screen.getByText('Contenido de cotizaciones')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cotizaciones' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('navigates with arrow keys (Radix roving tabindex)', async () => {
    const user = userEvent.setup();
    render(<ExampleTabs />);

    screen.getByRole('tab', { name: 'Solicitudes' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Cotizaciones' })).toHaveFocus();
    expect(screen.getByText('Contenido de cotizaciones')).toBeInTheDocument();
  });
});
